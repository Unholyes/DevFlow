import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    name: "Multi-Tenant Architecture",
    description: "Secure, isolated workspaces for different organizations with complete data separation.",
  },
  {
    name: "SDLC Methodologies",
    description: "Support for Scrum, Kanban, Waterfall, and DevOps with configurable workflows.",
  },
  {
    name: "Team Collaboration",
    description: "Real-time collaboration tools for distributed development teams.",
  },
  {
    name: "Project Tracking",
    description: "Comprehensive dashboards with burndown charts, progress tracking, and analytics.",
  },
]

export function Features() {
  return (
    <section className="py-24 bg-gray-100" style={{paddingTop: '96px', paddingBottom: '96px'}}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-black tracking-tight mb-4">
            Everything you need to manage development projects
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            DevFlow provides comprehensive tools for modern development teams to plan, track, and deliver projects efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
           {/* Top left: Card 1 */}
           <Card className="bg-gray-50 border-0 rounded-[24px] shadow-sm hover:shadow-md hover:bg-blue-50/30 transition-all duration-200 flex flex-col p-6 group">
             <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-blue-600">
                  {features[0].name}
                </CardTitle>
                <CardDescription className="text-gray-800 leading-relaxed">
                  {features[0].description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end justify-center pb-2 overflow-hidden">
                <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center text-gray-400 border shadow-lg transform translate-y-8 group-hover:translate-y-2 transition-transform duration-300 ease-out">
                  UI Screenshot
                </div>
              </CardContent>
           </Card>

           {/* Top middle: Card 2 */}
           <Card className="bg-gray-50 border-0 rounded-[24px] shadow-sm hover:shadow-md hover:bg-green-50/30 transition-all duration-200 flex flex-col p-6 group">
             <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-blue-600">
                  {features[1].name}
                </CardTitle>
                <CardDescription className="text-gray-800 leading-relaxed">
                  {features[1].description}
                </CardDescription>
              </CardHeader>
                <CardContent className="flex-grow flex items-end justify-center pb-2 overflow-hidden">
                  <div className="w-full h-32 bg-white rounded-xl flex items-center justify-center text-gray-400 border shadow-lg transform translate-y-8 group-hover:translate-y-2 transition-transform duration-300 ease-out">
                    UI Screenshot
                  </div>
                </CardContent>
           </Card>

           {/* Right: Tall card spanning 2 rows */}
           <Card className="row-span-2 bg-gray-50 border-0 rounded-[24px] shadow-sm hover:shadow-md hover:bg-yellow-50/30 transition-all duration-200 flex flex-col p-6 group">
             <CardHeader className="pb-4">
               <CardTitle className="text-xl font-semibold text-blue-600">
                 {features[3].name}
               </CardTitle>
               <CardDescription className="text-gray-800 leading-relaxed">
                 {features[3].description}
               </CardDescription>
             </CardHeader>
                <CardContent className="flex-grow flex items-end justify-end pr-4 overflow-hidden">
                  <div className="w-48 h-32 bg-white rounded-xl flex items-center justify-center text-gray-400 border shadow-lg transform translate-x-12 group-hover:translate-x-4 transition-transform duration-300 ease-out" style={{ height: '452px' }}>
                    UI Screenshot
                  </div>
                </CardContent>
           </Card>

            {/* Bottom left: Card 3 spanning 2 columns */}
            <Card className="md:col-span-2 md:h-80 bg-gray-50 border-0 rounded-[24px] shadow-sm hover:shadow-md hover:bg-red-50/30 transition-all duration-200 flex flex-col p-6 group">
             <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-blue-600">
                  {features[2].name}
                </CardTitle>
                <CardDescription className="text-gray-800 leading-relaxed">
                  {features[2].description}
                </CardDescription>
              </CardHeader>
                <CardContent className="flex-grow flex items-end justify-center pb-2 overflow-hidden">
                  <div className="w-64 h-40 bg-white rounded-xl flex items-center justify-center text-gray-400 border shadow-lg transform translate-y-8 group-hover:translate-y-2 transition-transform duration-300 ease-out">
                    UI Screenshot
                  </div>
                </CardContent>
           </Card>
        </div>
      </div>
    </section>
  )
}