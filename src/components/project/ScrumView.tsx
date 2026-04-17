// src/components/project/ScrumView.tsx

// 1. Define the shape of our task data so TypeScript is happy
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
}

export default function ScrumView({ tasks }: { tasks: Task[] }) {
  // 2. Sort the tasks into their respective columns
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  // 3. A reusable UI component for a single Task Card
  const TaskCard = ({ task }: { task: Task }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-3 cursor-grab hover:shadow-md transition-shadow">
      <h4 className="font-medium text-gray-800 text-sm mb-2">{task.title}</h4>
      <div className="flex justify-between items-center mt-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          task.priority === 'high' ? 'bg-red-100 text-red-700' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {task.priority}
        </span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {task.assignee}
        </span>
      </div>
    </div>
  );

  // 4. A reusable UI component for a Column
  const Column = ({ title, columnTasks }: { title: string, columnTasks: Task[] }) => (
    <div className="flex flex-col bg-gray-50 rounded-xl p-4 min-h-[500px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs py-1 px-2 rounded-full font-medium">
          {columnTasks.length}
        </span>
      </div>
      <div className="flex-1">
        {columnTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );

  // 5. Render the full board
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Sprint Board</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Create Task
        </button>
      </div>
      
      {/* The 4-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Column title="To Do" columnTasks={todoTasks} />
        <Column title="In Progress" columnTasks={inProgressTasks} />
        <Column title="Blocked" columnTasks={blockedTasks} />
        <Column title="Done" columnTasks={doneTasks} />
      </div>
    </div>
  );
}