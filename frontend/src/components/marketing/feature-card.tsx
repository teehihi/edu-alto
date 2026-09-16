import { ArrowRight, BookOpen, MonitorPlay, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import type { features } from "@/constants/home";

type Feature = (typeof features)[number];

const toneStyles = {
  primary: {
    card: "bg-[#4ac8ae] text-white",
    icon: "bg-[#edfff9] text-primary",
    link: "text-white",
    iconNode: BookOpen
  },
  blue: {
    card: "bg-white text-ink ring-1 ring-slate-200",
    icon: "bg-[#e0eaff] text-blue-500",
    link: "text-primary",
    iconNode: MonitorPlay
  },
  rose: {
    card: "bg-white text-ink ring-1 ring-slate-200",
    icon: "bg-[#fce7f6] text-pink-500",
    link: "text-primary",
    iconNode: ClipboardCheck
  }
};

export function FeatureCard({ feature }: { feature: Feature }) {
  const style = toneStyles[feature.tone];
  const Icon = style.iconNode;

  return (
    <article className={cn("group rounded-xl p-8 shadow-[0_34px_54px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-1", style.card)}>
      <div className="flex items-center gap-5">
        <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-[10px]", style.icon)}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="text-xl font-bold lg:text-2xl">{feature.title}</h3>
      </div>
      <p className={cn("mt-7 min-h-14 text-base leading-7", feature.tone === "primary" ? "text-white" : "text-[#646464]")}>
        {feature.description}
      </p>
      <a href="#" className={cn("focus-ring mt-5 inline-flex items-center gap-3 rounded-md text-base font-medium transition", style.link)}>
        Tìm hiểu thêm
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
      </a>
    </article>
  );
}
