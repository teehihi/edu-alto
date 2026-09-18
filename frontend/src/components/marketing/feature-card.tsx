import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { features } from "@/constants/home";

type Feature = (typeof features)[number];

const toneStyles = {
  primary: {
    card: "bg-primary text-white shadow-soft",
    iconBox: "bg-white/20",
    link: "text-white hover:text-white/90"
  },
  blue: {
    card: "bg-white text-ink border border-slate-100/80 shadow-soft",
    iconBox: "bg-[#EEF4FF]",
    link: "text-primary hover:text-primary-dark"
  },
  rose: {
    card: "bg-white text-ink border border-slate-100/80 shadow-soft",
    iconBox: "bg-[#FDF2F8]",
    link: "text-primary hover:text-primary-dark"
  }
};

export function FeatureCard({ feature }: { feature: Feature }) {
  const style = toneStyles[feature.tone];

  return (
    <article className={cn("group flex min-h-[250px] flex-col rounded-2xl p-8 transition duration-200 hover:-translate-y-1 hover:shadow-lg", style.card)}>
      <div className="flex items-center gap-4">
        <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl p-2.5", style.iconBox)}>
          <Image src={feature.icon} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
        </span>
        <h3 className="text-xl font-bold">{feature.title}</h3>
      </div>
      <p className={cn("mt-6 min-h-[72px] text-sm leading-7", feature.tone === "primary" ? "text-white/90" : "text-muted")}>
        {feature.description}
      </p>
      <a href="#courses" className={cn("focus-ring mt-auto inline-flex items-center gap-2 rounded-md text-sm font-semibold transition", style.link)}>
        Tìm hiểu thêm
        <ArrowRight className="h-4 w-4 transition duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </a>
    </article>
  );
}

