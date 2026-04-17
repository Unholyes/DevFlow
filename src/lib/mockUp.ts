// src/lib/mockProjects.ts

export const mockProjects = [
  {
    id: "1", // E-commerce project
    name: "E-Commerce Platform Redesign",
    
    // We track which phase the user is currently looking at
    activePhaseId: "phase-3", 
    phases: [
      {
        id: "phase-1",
        name: "Requirements",
        sdlcType: "Waterfall",
        status: "Completed",
      },
      {
        id: "phase-2",
        name: "Design",
        sdlcType: "Waterfall",
        status: "Completed",
      },
      {
        id: "phase-3",
        name: "Development",
        sdlcType: "Scrum",
        status: "In Progress",
      },
      {
        id: "phase-4",
        name: "Testing",
        sdlcType: "Kanban",
        status: "Not Started",
      }
    ]
  }
];