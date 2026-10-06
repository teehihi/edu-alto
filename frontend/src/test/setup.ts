import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { clearQueryClient } from "@/lib/query-provider";

afterEach(() => {
  clearQueryClient();
});
