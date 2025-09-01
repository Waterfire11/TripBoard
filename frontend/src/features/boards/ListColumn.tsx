import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import CardItem from './CardItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CardForm from './CardForm';
import { useUpdateList, useDeleteList, List, Card } from './hooks';
import { toast } from 'sonner';

interface ListColumnProps {
  list: List;
  boardId: number;
}

export default function ListColumn({ list, boardId }: ListColumnProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const { mutate: updateList } = useUpdateList(boardId);
  const { mutate: deleteList } = useDeleteList(boardId);

  const handleAddCard = () => {
    setShowAddCard(true);
  };

  const handleDeleteList = () => {
    if (confirm('Delete this list? Cards will be lost.')) {
      deleteList(list.id, {
        onSuccess: () => toast.success('List deleted'),
        onError: () => toast.error('Failed to delete list'),
      });
    }
  };

  const getListColor = (color: string) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      yellow: 'border-yellow-200 bg-yellow-50',
      gray: 'border-gray-200 bg-gray-50',
    };
    return colors[color as keyof typeof colors] || 'border-blue-200 bg-blue-50';
  };

  return (
    <div className={`flex-shrink-0 w-80 rounded-lg border-2 ${getListColor(list.color)}`}>
      {/* List Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {list.title}
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
              {list.cards.length}
            </span>
          </h3>
          <div className="flex gap-2">
            <button className="p-1 hover:bg-gray-200 rounded transition-colors" aria-label={`More options for ${list.title}`}>
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>
            <button onClick={handleDeleteList} className="p-1 hover:bg-red-100 rounded transition-colors text-red-500" aria-label={`Delete list ${list.title}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <Droppable droppableId={list.id.toString()}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="p-4 space-y-3 min-h-[100px]"
          >
            {list.cards.sort((a: Card, b: Card) => a.position - b.position).map((card: Card, index: number) => (
              <CardItem key={card.id} card={card} index={index} boardId={boardId} listId={list.id} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add Card */}
      <div className="p-4 border-t border-gray-200">
        <Button onClick={handleAddCard} className="w-full">
          <Plus className="h-5 w-5" /> Add Card
        </Button>
      </div>

      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Card</DialogTitle>
          </DialogHeader>
          <CardForm boardId={boardId} listId={list.id} onSuccess={() => setShowAddCard(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}