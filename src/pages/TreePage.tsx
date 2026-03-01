import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node, Edge, Connection, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
import { roleLabels, canEdit } from '../utils/roleUtils';
import type { Person, RelationshipType, TreeRole, TreeMember } from '../types';

// Custom person node data type
type PersonNodeData = {
  person: Person;
  onClick: (p: Person) => void;
};

// Custom person node component
const PersonNode = ({ data }: NodeProps) => {
  const { person, onClick } = data as PersonNodeData;
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
      <div
        className={`rounded-xl border-2 p-3 text-center shadow-sm hover:shadow-md transition-shadow bg-white ${
          isMale ? 'border-green-300' : isFemale ? 'border-pink-300' : 'border-gray-300'
        }`}
      >
        {person.avatarUrl ? (
          <img
            src={person.avatarUrl}
            alt={fullName}
            className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-semibold text-sm ${
              isMale ? 'bg-green-500' : isFemale ? 'bg-pink-500' : 'bg-gray-500'
            }`}
          >
            {initials || '?'}
          </div>
        )}
        <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{fullName}</p>
        {person.birthDate && (
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(person.birthDate).getFullYear()}
            {person.deathDate ? ` – ${new Date(person.deathDate).getFullYear()}` : ''}
          </p>
        )}
      </div>
    </div>
  );
};

const nodeTypes = { person: PersonNode };

export const TreePage = () => {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const treeIdNum = Number(treeId);

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

  const persons = graphData?.data?.persons ?? [];
  const relationships = graphData?.data?.relationships ?? [];
  const members: TreeMember[] = membersData?.data ?? [];

  // Navigate to person on node click
  const handlePersonClick = useCallback(
    (person: Person) => {
      navigate(`/trees/${treeIdNum}/persons/${person.id}`);
    },
    [navigate, treeIdNum]
  );

  // Build React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const COLS = 4;
    const H_GAP = 200;
    const V_GAP = 160;

    const initialNodes: Node[] = persons.map((person, index) => ({
      id: String(person.id),
      type: 'person',
      position: {
        x: (index % COLS) * H_GAP,
        y: Math.floor(index / COLS) * V_GAP,
      },
      data: { person, onClick: handlePersonClick } as PersonNodeData,
    }));

    const initialEdges: Edge[] = relationships.map((rel) => ({
      id: String(rel.id),
      source: String(rel.person1Id),
      target: String(rel.person2Id),
      label: rel.type === 'PARENT_CHILD' ? 'Родитель' : 'Партнёр',
      style: {
        stroke: rel.type === 'PARENT_CHILD' ? '#3b82f6' : '#ec4899',
        strokeWidth: 2,
      },
      labelStyle: { fontSize: 10, fill: '#6b7280' },
      labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.8 },
    }));

    return { initialNodes, initialEdges };
  }, [persons, relationships, handlePersonClick]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8">
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
      <div style={{ height: 'calc(100vh - 130px)' }}>
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
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const person = (node.data as PersonNodeData).person;
                return person.gender === 'MALE'
                  ? '#93c5fd'
                  : person.gender === 'FEMALE'
                  ? '#f9a8d4'
                  : '#d1d5db';
              }}
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
            />
          </ReactFlow>
        )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Биография</label>
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

      {/* Relationships list panel */}
      {relationships.length > 0 && canEditTree && (
        <div className="fixed bottom-4 right-4 z-10">
          <details className="bg-white border border-gray-200 rounded-xl shadow-lg">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
              <GitMerge className="w-4 h-4" />
              Связи ({relationships.length})
            </summary>
            <div className="max-h-48 overflow-y-auto px-4 pb-3 space-y-2">
              {relationships.map((rel) => {
                const p1 = persons.find((p) => p.id === rel.person1Id);
                const p2 = persons.find((p) => p.id === rel.person2Id);
                return (
                  <div key={rel.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-700">
                      {p1?.firstName} {p1?.lastName}
                      <span className="text-gray-400 mx-1">
                        {rel.type === 'PARENT_CHILD' ? '→' : '↔'}
                      </span>
                      {p2?.firstName} {p2?.lastName}
                    </span>
                    <button
                      onClick={() =>
                        deleteRelMutation.mutate({
                          p1: rel.person1Id,
                          p2: rel.person2Id,
                          type: rel.type,
                        })
                      }
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
