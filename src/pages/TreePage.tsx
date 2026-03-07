import { useState, useCallback, useMemo, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { TreeFiltersPanel, defaultFilters } from '../components/TreeFiltersPanel';
import type { TreeFilters } from '../components/TreeFiltersPanel';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import type { Node, Edge, Connection, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// @ts-ignore
import dagre from 'dagre';
import {
  Plus,
  Users,
  ArrowLeft,
  Search,
  UserPlus,
  GitMerge,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { personService, treeService } from '../api/trees';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { VoiceInputButton } from '../components/ui/VoiceInputButton';
import { roleLabels, canEdit } from '../utils/roleUtils';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Person, RelationshipType, TreeRole, TreeMember } from '../types';

// Custom person node data type
type PersonNodeData = {
  person: Person;
  onClick: (p: Person) => void;
  showPhoto: boolean;
  showBirthPlace: boolean;
};

// Invisible couple node — rendered as a small pink dot
const CoupleNode = () => (
  <div
    style={{
      width: 8,
      height: 8,
      background: '#ec4899',
      borderRadius: '50%',
      border: '2px solid #ec4899',
    }}
  />
);

// Custom person node component
const PersonNode = ({ data }: NodeProps) => {
  const { person, onClick, showPhoto, showBirthPlace } = data as PersonNodeData;
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const initials = [person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('');
  const isMale = person.gender === 'MALE';
  const isFemale = person.gender === 'FEMALE';

  return (
    <div
      onClick={() => onClick(person)}
      className="cursor-pointer select-none"
      style={{ width: 140 }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#9ca3af' }} />
      <Handle type="target" position={Position.Left} id="left" style={{ background: '#9ca3af' }} />
      <div
        className={`rounded-xl border-2 p-3 text-center shadow-sm hover:shadow-md transition-shadow bg-white ${
          isMale ? 'border-green-300' : isFemale ? 'border-pink-300' : 'border-gray-300'
        }`}
      >
        {showPhoto && person.avatarUrl ? (
          <img
            src={person.avatarUrl}
            alt={fullName}
            className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
          />
        ) : showPhoto ? (
          <div
            className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-semibold text-sm ${
              isMale ? 'bg-green-500' : isFemale ? 'bg-pink-500' : 'bg-gray-500'
            }`}
          >
            {initials || '?'}
          </div>
        ) : null}
        <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{fullName}</p>
        {person.birthDate && (
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(person.birthDate).getFullYear()}
            {person.deathDate ? ` – ${new Date(person.deathDate).getFullYear()}` : ''}
          </p>
        )}
        {showBirthPlace && person.birthPlace && (
          <p className="text-xs text-gray-400 mt-0.5 truncate" title={person.birthPlace}>
            📍 {person.birthPlace}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#9ca3af' }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: '#9ca3af' }} />
    </div>
  );
};

// ─── Layout helpers ───────────────────────────────────────────────────────────

type LayoutMode = 'vertical' | 'horizontal' | 'radial';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  mode: LayoutMode
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  if (mode === 'radial') {
    // Separate person nodes from couple nodes
    const personNodes = nodes.filter(n => n.type !== 'coupleNode');
    const coupleNodesList = nodes.filter(n => n.type === 'coupleNode');
    const centerX = 400;
    const centerY = 400;
    const radius = Math.max(200, personNodes.length * 60);
    const layoutedPersonNodes = personNodes.map((node, index) => {
      if (index === 0) {
        return { ...node, position: { x: centerX - NODE_WIDTH / 2, y: centerY - NODE_HEIGHT / 2 } };
      }
      const angle = ((index - 1) / (personNodes.length - 1)) * 2 * Math.PI;
      return {
        ...node,
        position: {
          x: centerX + radius * Math.cos(angle) - NODE_WIDTH / 2,
          y: centerY + radius * Math.sin(angle) - NODE_HEIGHT / 2,
        },
      };
    });
    // Position couple nodes between their two partners
    const posMap = new Map(layoutedPersonNodes.map(n => [n.id, n.position]));
    const layoutedCoupleNodes = coupleNodesList.map(cn => {
      const partnerEdges = edges.filter(e => e.target === cn.id);
      if (partnerEdges.length === 2) {
        const pos1 = posMap.get(partnerEdges[0].source);
        const pos2 = posMap.get(partnerEdges[1].source);
        if (pos1 && pos2) {
          return {
            ...cn,
            position: {
              x: (pos1.x + pos2.x) / 2 + NODE_WIDTH / 2 - 4,
              y: (pos1.y + pos2.y) / 2 + NODE_HEIGHT / 2 - 4,
            },
          };
        }
      }
      return cn;
    });
    return { nodes: [...layoutedPersonNodes, ...layoutedCoupleNodes], edges };
  }

  // Dagre layout for vertical and horizontal
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const direction = mode === 'horizontal' ? 'LR' : 'TB';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  nodes.forEach((node) => {
    const w = node.type === 'coupleNode' ? 8 : NODE_WIDTH;
    const h = node.type === 'coupleNode' ? 8 : NODE_HEIGHT;
    dagreGraph.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return node;
    const w = node.type === 'coupleNode' ? 8 : NODE_WIDTH;
    const h = node.type === 'coupleNode' ? 8 : NODE_HEIGHT;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - w / 2,
        y: nodeWithPosition.y - h / 2,
      },
    };
  });

  // Post-process: center couple nodes between their two partners
  const posMap = new Map(layoutedNodes.map(n => [n.id, n.position]));
  const finalNodes = layoutedNodes.map(node => {
    if (node.type !== 'coupleNode') return node;
    const partnerEdges = edges.filter(e => e.target === node.id);
    if (partnerEdges.length === 2) {
      const pos1 = posMap.get(partnerEdges[0].source);
      const pos2 = posMap.get(partnerEdges[1].source);
      if (pos1 && pos2) {
        return {
          ...node,
          position: {
            x: (pos1.x + pos2.x) / 2 + NODE_WIDTH / 2 - 4,
            y: Math.min(pos1.y, pos2.y) + NODE_HEIGHT / 2 - 4,
          },
        };
      }
    }
    return node;
  });

  return { nodes: finalNodes, edges };
}

export const TreePage = () => {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const treeIdNum = Number(treeId);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('vertical');
  const [filters, setFilters] = useState<TreeFilters>(defaultFilters);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [addPersonModalOpen, setAddPersonModalOpen] = useState(false);
  const [addRelModalOpen, setAddRelModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson1, setSelectedPerson1] = useState<number | ''>('');
  const [selectedPerson2, setSelectedPerson2] = useState<number | ''>('');
  const [relType, setRelType] = useState<RelationshipType>('PARENT_CHILD');

  // Person form state
  const [personForm, setPersonForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    deathPlace: '',
    biography: '',
  });

  // Fetch trees to get current tree info
  const { data: treesData } = useQuery({
    queryKey: ['trees'],
    queryFn: () => treeService.getTrees(),
  });
  const currentTree = treesData?.data?.find((t) => t.id === treeIdNum);
  usePageTitle(currentTree?.name);
  const userRole = currentTree?.role as TreeRole | undefined;
  const canEditTree = canEdit(userRole);

  // Fetch graph data
  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['graph', treeIdNum],
    queryFn: () => personService.getGraph(treeIdNum),
    enabled: !!treeIdNum,
  });

  // Fetch members
  const { data: membersData } = useQuery({
    queryKey: ['members', treeIdNum],
    queryFn: () => treeService.getTreeMembers(treeIdNum),
    enabled: !!treeIdNum,
  });

  const members: TreeMember[] = membersData?.data ?? [];

  // Navigate to person on node click
  const handlePersonClick = useCallback(
    (person: Person) => {
      navigate(`/trees/${treeIdNum}/persons/${person.id}`);
    },
    [navigate, treeIdNum]
  );

  // Derive persons for use in search, modals, and sidebar
  const persons = useMemo<Person[]>(() => {
    if (!graphData?.data) return [];
    return Array.isArray(graphData.data) ? graphData.data : [];
  }, [graphData]);

  // Derive deduplicated relationships for the sidebar panel
  const relationships = useMemo(() => {
    const seenIds = new Set<number>();
    return persons.flatMap((p) => p.relationships ?? []).filter((r) => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });
  }, [persons]);

  // nodeTypes defined with useMemo to keep a stable reference
  const nodeTypes = useMemo(() => ({
    personNode: PersonNode,
    coupleNode: CoupleNode,
  }), []);

  // Build React Flow nodes and edges using the couple node pattern
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!graphData?.data) return { initialNodes: [], initialEdges: [] };

    const personsList: Person[] = Array.isArray(graphData.data) ? graphData.data : [];

    // Deduplicate relationships across all persons
    const seenIds = new Set<number>();
    const allRels = personsList.flatMap((p) => p.relationships ?? []).filter((r) => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });

    const partnerships = allRels.filter(r => r.type === 'PARTNERSHIP');
    const parentChildRels = allRels.filter(r => r.type === 'PARENT_CHILD');

    // Build couple nodes and their edges
    const coupleNodes: Node[] = [];
    const coupleEdges: Edge[] = [];
    // Map from "minId-maxId" to coupleNodeId
    const coupleNodeMap = new Map<string, string>();

    for (const rel of partnerships) {
      const a = Math.min(rel.person1Id, rel.person2Id);
      const b = Math.max(rel.person1Id, rel.person2Id);
      const coupleKey = `${a}-${b}`;
      const coupleId = `couple-${coupleKey}`;
      coupleNodeMap.set(coupleKey, coupleId);

      coupleNodes.push({
        id: coupleId,
        type: 'coupleNode',
        data: {},
        position: { x: 0, y: 0 },
        style: { width: 8, height: 8 },
      });

      // Edge from person A (person1Id) to couple node
      coupleEdges.push({
        id: `edge-couple-${rel.person1Id}-${coupleId}`,
        source: String(rel.person1Id),
        target: coupleId,
        style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '6 3' },
        type: 'straight',
        animated: false,
        label: 'Партнёр',
        labelStyle: { fontSize: 10, fill: '#ec4899' },
      });

      // Edge from person B (person2Id) to couple node
      coupleEdges.push({
        id: `edge-couple-${rel.person2Id}-${coupleId}`,
        source: String(rel.person2Id),
        target: coupleId,
        style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '6 3' },
        type: 'straight',
        animated: false,
      });
    }

    // For PARENT_CHILD: route through couple node if parent has a partner
    const childEdges: Edge[] = [];
    for (const rel of parentChildRels) {
      const parentId = rel.person1Id;
      const childId = rel.person2Id;

      // Find if this parent has a partnership
      const partnerRel = partnerships.find(
        p => p.person1Id === parentId || p.person2Id === parentId
      );

      let sourceId: string;
      if (partnerRel) {
        const a = Math.min(partnerRel.person1Id, partnerRel.person2Id);
        const b = Math.max(partnerRel.person1Id, partnerRel.person2Id);
        const coupleKey = `${a}-${b}`;
        sourceId = coupleNodeMap.get(coupleKey) ?? String(parentId);
      } else {
        sourceId = String(parentId);
      }

      childEdges.push({
        id: `edge-${rel.id}`,
        source: sourceId,
        target: String(childId),
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        type: 'default',
        animated: false,
      });
    }

    // Person nodes
    const initialNodes: Node[] = [
      ...personsList.map((person) => ({
        id: String(person.id),
        type: 'personNode',
        data: {
          person,
          onClick: handlePersonClick,
          showPhoto: true,
          showBirthPlace: false,
        } as PersonNodeData,
        position: { x: 0, y: 0 },
      })),
      ...coupleNodes,
    ];

    const initialEdges: Edge[] = [...coupleEdges, ...childEdges];

    return { initialNodes, initialEdges };
  }, [graphData, handlePersonClick]);

  // Filter persons based on active filters
  const filteredPersonsForGraph = useMemo(() => {
    let result = persons;

    // Gender filter
    if (filters.gender !== 'all') {
      result = result.filter(p => p.gender === filters.gender);
    }

    // Birth year filters
    if (filters.bornAfter) {
      const year = parseInt(filters.bornAfter);
      result = result.filter(p => {
        if (!p.birthDate) return true;
        const birthYear = new Date(p.birthDate).getFullYear();
        return birthYear >= year;
      });
    }
    if (filters.bornBefore) {
      const year = parseInt(filters.bornBefore);
      result = result.filter(p => {
        if (!p.birthDate) return true;
        const birthYear = new Date(p.birthDate).getFullYear();
        return birthYear <= year;
      });
    }

    return result;
  }, [persons, filters]);

  // Build filtered nodes/edges, passing through couple nodes whose both partners pass the filter
  const { filteredNodes, filteredEdges } = useMemo(() => {
    const allowedPersonIds = new Set(filteredPersonsForGraph.map(p => String(p.id)));

    // Keep person nodes that pass filter + couple nodes whose BOTH partners pass filter
    const preFilteredNodes = initialNodes.filter(n => {
      if (n.type === 'coupleNode') {
        const partnerEdges = initialEdges.filter(e => e.target === n.id);
        return partnerEdges.every(e => allowedPersonIds.has(e.source));
      }
      return allowedPersonIds.has(n.id);
    });

    const allowedNodeIds = new Set(preFilteredNodes.map(n => n.id));

    const filteredEdges = initialEdges.filter(
      e => allowedNodeIds.has(e.source) && allowedNodeIds.has(e.target)
    );

    // Inject showPhoto/showBirthPlace into person nodes
    const filteredNodes = preFilteredNodes.map(n => {
      if (n.type !== 'personNode') return n;
      return {
        ...n,
        data: {
          ...(n.data as PersonNodeData),
          showPhoto: filters.showPhotos,
          showBirthPlace: filters.showBirthPlace,
        } as PersonNodeData,
      };
    });

    return { filteredNodes, filteredEdges };
  }, [initialNodes, initialEdges, filteredPersonsForGraph, filters.showPhotos, filters.showBirthPlace]);

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges);

  useEffect(() => {
    if (filteredNodes.length > 0 || filteredEdges.length > 0) {
      const { nodes: ln, edges: le } = getLayoutedElements(filteredNodes, filteredEdges, layoutMode);
      setNodes(ln);
      setEdges(le);
    } else if (persons.length === 0) {
      setNodes([]);
      setEdges([]);
    }
  }, [filteredNodes, filteredEdges, layoutMode, setNodes, setEdges, persons.length]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = () => setExportMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [exportMenuOpen]);

  const exportToPng = async () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;
    toast.loading('Экспортируем...', { id: 'export' });
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `${currentTree?.name || 'дерево'}-дерево.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Файл сохранён', { id: 'export' });
    } catch {
      toast.error('Ошибка экспорта', { id: 'export' });
    }
    setExportMenuOpen(false);
  };

  const exportToPdf = async () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;
    toast.loading('Экспортируем...', { id: 'export' });
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const pdf = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${currentTree?.name || 'дерево'}-дерево.pdf`);
      toast.success('Файл сохранён', { id: 'export' });
    } catch {
      toast.error('Ошибка экспорта', { id: 'export' });
    }
    setExportMenuOpen(false);
  };

  // Mutations
  const createPersonMutation = useMutation({
    mutationFn: () =>
      personService.createPerson(treeIdNum, {
        firstName: personForm.firstName,
        lastName: personForm.lastName,
        middleName: personForm.middleName || undefined,
        gender: personForm.gender,
        birthDate: personForm.birthDate || undefined,
        deathDate: personForm.deathDate || undefined,
        birthPlace: personForm.birthPlace || undefined,
        deathPlace: personForm.deathPlace || undefined,
        biography: personForm.biography || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph', treeIdNum] });
      setAddPersonModalOpen(false);
      setPersonForm({
        firstName: '',
        lastName: '',
        middleName: '',
        gender: 'MALE',
        birthDate: '',
        deathDate: '',
        birthPlace: '',
        deathPlace: '',
        biography: '',
      });
      toast.success('Персона добавлена!');
    },
    onError: () => toast.error('Ошибка добавления персоны'),
  });

  const addRelMutation = useMutation({
    mutationFn: () =>
      personService.addRelationship(treeIdNum, {
        person1Id: Number(selectedPerson1),
        person2Id: Number(selectedPerson2),
        type: relType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph', treeIdNum] });
      setAddRelModalOpen(false);
      setSelectedPerson1('');
      setSelectedPerson2('');
      toast.success('Связь добавлена!');
    },
    onError: () => toast.error('Ошибка добавления связи'),
  });

  const deleteRelMutation = useMutation({
    mutationFn: ({ p1, p2, type }: { p1: number; p2: number; type: RelationshipType }) =>
      personService.deleteRelationship(treeIdNum, { person1Id: p1, person2Id: p2, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph', treeIdNum] });
      toast.success('Связь удалена');
    },
    onError: () => toast.error('Ошибка удаления связи'),
  });

  // Search
  const filteredPersons = searchQuery
    ? persons.filter((p) =>
        `${p.firstName} ${p.lastName} ${p.middleName ?? ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : [];

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{currentTree?.name ?? 'Дерево'}</h1>
            {userRole && (
              <Badge
                variant={
                  userRole === 'OWNER' ? 'info' : userRole === 'EDITOR' ? 'success' : 'default'
                }
              >
                {roleLabels[userRole]}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout mode buttons */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
            <button
              onClick={() => setLayoutMode('vertical')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                layoutMode === 'vertical'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Вертикальное расположение"
            >
              ⬇ Верт.
            </button>
            <button
              onClick={() => setLayoutMode('horizontal')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                layoutMode === 'horizontal'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Горизонтальное расположение"
            >
              ➡ Гориз.
            </button>
            <button
              onClick={() => setLayoutMode('radial')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                layoutMode === 'radial'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Радиальное расположение"
            >
              ⭕ Радиал.
            </button>
          </div>

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск персоны..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-48"
            />
            {searchQuery && filteredPersons.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-64 max-h-48 overflow-y-auto">
                {filteredPersons.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate(`/trees/${treeIdNum}/persons/${p.id}`);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    {p.firstName} {p.lastName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setMembersModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Участники</span>
            <span className="bg-gray-200 text-gray-700 text-xs rounded-full px-1.5 py-0.5">
              {members.length}
            </span>
          </button>

          {/* Export button with dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span>📤</span>
              <span>Экспорт</span>
              <span className="text-xs">▼</span>
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[160px] overflow-hidden">
                <button
                  onClick={exportToPng}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>🖼</span>
                  <span>Экспорт в PNG</span>
                </button>
                <button
                  onClick={exportToPdf}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  <span>📄</span>
                  <span>Экспорт в PDF</span>
                </button>
              </div>
            )}
          </div>

          {canEditTree && (
            <>
              <button
                onClick={() => setAddRelModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm transition-colors"
              >
                <GitMerge className="w-4 h-4" />
                <span className="hidden sm:inline">Связь</span>
              </button>
              <button
                onClick={() => setAddPersonModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Добавить</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Graph */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} className="w-full">
        {graphLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : persons.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Дерево пустое</h2>
            <p className="text-gray-600 mb-6">Добавьте первого члена семьи</p>
            {canEditTree && (
              <button
                onClick={() => setAddPersonModalOpen(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                <UserPlus className="w-5 h-5" />
                Добавить персону
              </button>
            )}
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            key={layoutMode}
            style={{ width: '100%', height: '100%' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
            <Controls />
          </ReactFlow>
        )}
        <TreeFiltersPanel filters={filters} onChange={setFilters} />
      </div>

      {/* Add Person Modal */}
      <Modal
        isOpen={addPersonModalOpen}
        onClose={() => setAddPersonModalOpen(false)}
        title="Добавить персону"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
              <input
                value={personForm.firstName}
                onChange={(e) => setPersonForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Иван"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия *</label>
              <input
                value={personForm.lastName}
                onChange={(e) => setPersonForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Иванов"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Отчество</label>
            <input
              value={personForm.middleName}
              onChange={(e) => setPersonForm((f) => ({ ...f, middleName: e.target.value }))}
              placeholder="Иванович"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пол *</label>
            <select
              value={personForm.gender}
              onChange={(e) =>
                setPersonForm((f) => ({
                  ...f,
                  gender: e.target.value as 'MALE' | 'FEMALE' | 'OTHER',
                }))
              }
              className={inputClass + ' bg-white'}
            >
              <option value="MALE">Мужской</option>
              <option value="FEMALE">Женский</option>
              <option value="OTHER">Другой</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
              <input
                type="date"
                value={personForm.birthDate}
                onChange={(e) => setPersonForm((f) => ({ ...f, birthDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата смерти</label>
              <input
                type="date"
                value={personForm.deathDate}
                onChange={(e) => setPersonForm((f) => ({ ...f, deathDate: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Место рождения</label>
              <input
                value={personForm.birthPlace}
                onChange={(e) => setPersonForm((f) => ({ ...f, birthPlace: e.target.value }))}
                placeholder="Москва"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Место смерти</label>
              <input
                value={personForm.deathPlace}
                onChange={(e) => setPersonForm((f) => ({ ...f, deathPlace: e.target.value }))}
                placeholder="Санкт-Петербург"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Биография</label>
              <VoiceInputButton
                onResult={(text) =>
                  setPersonForm((f) => ({
                    ...f,
                    biography: (f.biography ? f.biography + ' ' : '') + text,
                  }))
                }
              />
            </div>
            <textarea
              value={personForm.biography}
              onChange={(e) => setPersonForm((f) => ({ ...f, biography: e.target.value }))}
              placeholder="Краткая биография..."
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setAddPersonModalOpen(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => createPersonMutation.mutate()}
              disabled={
                !personForm.firstName.trim() ||
                !personForm.lastName.trim() ||
                createPersonMutation.isPending
              }
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createPersonMutation.isPending ? <Spinner size="sm" /> : null}
              Добавить
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Relationship Modal */}
      <Modal
        isOpen={addRelModalOpen}
        onClose={() => setAddRelModalOpen(false)}
        title="Добавить связь"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Персона 1</label>
            <select
              value={selectedPerson1}
              onChange={(e) =>
                setSelectedPerson1(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={inputClass + ' bg-white'}
            >
              <option value="">Выберите персону</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип связи</label>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value as RelationshipType)}
              className={inputClass + ' bg-white'}
            >
              <option value="PARENT_CHILD">Родитель → Ребёнок</option>
              <option value="PARTNERSHIP">Партнёрство</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Персона 2</label>
            <select
              value={selectedPerson2}
              onChange={(e) =>
                setSelectedPerson2(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={inputClass + ' bg-white'}
            >
              <option value="">Выберите персону</option>
              {persons
                .filter((p) => p.id !== Number(selectedPerson1))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setAddRelModalOpen(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => addRelMutation.mutate()}
              disabled={!selectedPerson1 || !selectedPerson2 || addRelMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addRelMutation.isPending ? <Spinner size="sm" /> : null}
              Добавить
            </button>
          </div>
        </div>
      </Modal>

      {/* Members Modal */}
      <Modal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        title="Участники дерева"
        size="lg"
      >
        <div className="space-y-3">
          {members.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Нет участников</p>
          ) : (
            members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <Badge
                  variant={
                    member.role === 'OWNER'
                      ? 'info'
                      : member.role === 'EDITOR'
                      ? 'success'
                      : 'default'
                  }
                >
                  {roleLabels[member.role]}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Modal>

    </div>
  );
};
