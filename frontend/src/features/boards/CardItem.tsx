import { Draggable } from '@hello-pangea/dnd';
import { CreditCard, Clock, MapPin, Tag } from 'lucide-react';
import { Card } from './hooks';

interface CardItemProps {
  card: Card;
  index: number;
  boardId: number;
  listId: number;
}

export default function CardItem({ card, index, boardId, listId }: CardItemProps) {
  const getTagColor = (tag: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
    ];
    return colors[tag.length % colors.length];
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getCompletedSubtasks = (subtasks: { title: string; completed: boolean }[]) => {
    return subtasks.filter(subtask => subtask.completed).length;
  };

  return (
    <Draggable draggableId={card.id.toString()} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <h4 className="font-medium text-gray-900 text-sm mb-3">{card.title}</h4>
          {card.description && (
            <p className="text-gray-600 text-xs mb-3 line-clamp-2">{card.description}</p>
          )}
          {card.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 mb-3">
              {card.tags.slice(0, 2).map((tag: string) => (
                <span key={tag} className={`text-xs px-2 py-1 rounded-full ${getTagColor(tag)}`}>
                  {tag}
                </span>
              ))}
              {card.tags.length > 2 && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  +{card.tags.length - 2}
                </span>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-xs mb-3">No tags added.</p>
          )}
          {card.subtasks.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Subtasks</span>
                <span>{getCompletedSubtasks(card.subtasks)}/{card.subtasks.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all"
                  style={{
                    width: `${(getCompletedSubtasks(card.subtasks) / card.subtasks.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {parseFloat(card.budget) > 0 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <CreditCard className="h-3 w-3" />
                  <span>{formatCurrency(card.budget)}</span>  // Raw budget
                </div>
              )}
              {card.due_date && (
                <div className={`flex items-center gap-1 ${isOverdue(card.due_date) ? 'text-red-600' : 'text-gray-600'}`}>
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(card.due_date)}</span>
                </div>
              )}
              {card.location && (
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="h-3 w-3" />
                  <span>{card.location.name}</span>
                </div>
              )}
            </div>
            {card.assigned_members.length > 0 && (
              <div className="flex -space-x-1">
                {card.assigned_members.slice(0, 2).map((member) => (
                  <div
                    key={member.id}
                    className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium border border-white"
                    title={member.username}
                  >
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                ))}
                {card.assigned_members.length > 2 && (
                  <div className="w-5 h-5 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium border border-white">
                    +{card.assigned_members.length - 2}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}