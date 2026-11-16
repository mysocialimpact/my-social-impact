import { WorkspaceTracker } from "@/components/workspace-tracker";
export default async function ReviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="report-workspace">
      <WorkspaceTracker key={(await params).id} id={(await params).id} />
      {children}
    </div>
  );
}
