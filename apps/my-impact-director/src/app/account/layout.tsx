import "./workspace.css";
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="account-workspace-page">{children}</div>;
}
