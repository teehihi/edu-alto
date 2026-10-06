import { CalendarSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8">
      <CalendarSkeleton />
    </div>
  );
}
