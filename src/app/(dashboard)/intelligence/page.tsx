import { redirect } from "next/navigation";

/**
 * Data Intelligence has been unified under Data Health (/data-sources?tab=intelligence).
 * This redirect route ensures all existing links, bookmarks, and deep routes
 * seamlessly land on the Data Intelligence section without 404s.
 */
export default function IntelligencePage() {
  redirect("/data-sources?tab=intelligence");
}
