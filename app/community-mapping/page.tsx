import type { Metadata } from "next";
import { CommunityMappingPage } from "../community-mapping";
import "../community-mapping.css";

export const metadata: Metadata = {
  title: "Community Mapping",
  description: "Community Mapping from My Social Impact combines data, research and human intelligence to understand the people, places, relationships, needs and opportunities shaping a community.",
};

export default function Page() {
  return <CommunityMappingPage />;
}
