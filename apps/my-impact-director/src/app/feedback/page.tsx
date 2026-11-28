import { Feedback } from "@/components/feedback";
export const metadata = { title: "Help us make this better" };
export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; issue?: string }>;
}) {
  const params = await searchParams;
  const value = params.from || "/";
  const from =
    typeof value === "string" &&
    /^\/(?!\/)[^?#\\\s]*$/.test(value) &&
    value.length <= 200
      ? value
      : "/";
  return (
    <>
      <Feedback dedicated from={from} uploadIssue={params.issue === "upload"} />
    </>
  );
}
