import SorpFilm from "../sorp-film/sorp-film";

export const metadata = {
  title: "SORP animated explainer",
  description:
    "A free assessment of social impact and sustainability aspects of SORP 2026 reporting. Not a full SORP review.",
  robots: { index: false, follow: false },
};

export default async function AnimationPage({
  searchParams,
}: {
  searchParams: Promise<{ time?: string; capture?: string; slide?: string }>;
}) {
  const params = await searchParams;
  const fixedTime = params.time === undefined ? undefined : Number(params.time);
  const capture = params.capture === "1";
  return (
    <main className={capture ? "sf-capture" : "sf-presentation"}>
      <SorpFilm time={fixedTime} controls={!capture} initialSlide={params.slide === undefined ? 0 : Number(params.slide) - 1} />
    </main>
  );
}
