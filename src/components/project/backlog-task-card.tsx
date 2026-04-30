import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, GripVertical } from 'lucide-react';

interface BacklogTaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    storyPoints: number;
    assignee: string | null;
    position: number;
  };
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showCheckbox?: boolean;
  showActions?: boolean;
}

const priorityColors = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-green-50 text-green-700 border-green-200',
};

const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

const getAvatarColor = (name: string) => {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

export function BacklogTaskCard({
  task,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  showCheckbox = true,
  showActions = true,
}: BacklogTaskCardProps) {
  return (
    <div className={`group border rounded-lg p-4 transition-all hover:shadow-md ${
      isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <div className="cursor-grab text-gray-300 hover:text-gray-500 mt-1">
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Checkbox */}
        {showCheckbox ? (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        ) : null}

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-400">{task.id}</span>
                <Badge variant="outline" className={`${priorityColors[task.priority]} text-xs font-medium`}>
                  {task.priority}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
            </div>

            {/* Story Points */}
            <div className="flex flex-col items-end gap-2">
              <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold text-sm">
                {task.storyPoints} pts
              </div>
              {task.assignee && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(task.assignee)}`}>
                  {task.assignee}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
