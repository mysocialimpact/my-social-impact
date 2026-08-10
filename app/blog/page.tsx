import type { Metadata } from "next";
import { BlogPage } from "../site-shell";

export const metadata: Metadata = {
  title: "Blog",
  description: "The latest thinking from My Social Impact.",
};

export default function Page() {
  return <BlogPage />;
}
