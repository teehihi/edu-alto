import { BarChart3, BookOpen, ClipboardCheck, Search, Users } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course/course-card";
import { FeatureCard } from "@/components/marketing/feature-card";
import { features, popularCourses } from "@/constants/home";

export function HomePage() {
  return (
    <main>
      <AppHeader />
      <section className="relative overflow-hidden bg-[rgba(36,187,140,0.02)]">
        <div className="absolute -left-20 top-36 h-80 w-80 rounded-full border border-primary/20" />
        <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full border border-primary/20" />
        <div className="container-page grid min-h-[720px] items-center gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div>
            <h1 className="max-w-3xl text-5xl font-bold capitalize leading-tight tracking-normal text-ink sm:text-6xl lg:text-[60px] lg:leading-[82px]">
              Nâng tầm <span className="text-primary">kỹ năng</span>
              <br />
              <span className="text-primary">bứt phá</span> sự nghiệp
            </h1>
            <p className="mt-5 max-w-xl text-base leading-[1.8] text-[#646464]">
              Nền tảng học tập trực tuyến dành cho người học Việt Nam, giúp bạn theo dõi khóa học, luyện tập và tiến bộ theo lộ trình rõ ràng.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg">Khám phá ngay</Button>
              <Button size="lg" variant="secondary">
                Trải nghiệm miễn phí
              </Button>
            </div>
            <div className="mt-10 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
              <Benefit icon={<BookOpen className="h-5 w-5 text-feature-yellow" />} label="Nội dung đa dạng" />
              <Benefit icon={<Users className="h-5 w-5 text-feature-coral" />} label="Học tập linh hoạt" />
              <Benefit icon={<BarChart3 className="h-5 w-5 text-feature-rose" />} label="Theo dõi tiến độ" />
            </div>
          </div>

          <div className="relative mx-auto h-[380px] w-full max-w-[560px] sm:h-[520px]">
            <div className="absolute inset-x-8 top-8 aspect-square rounded-full border border-primary/40 bg-primary" />
            <div className="absolute left-1/2 top-12 h-[300px] w-[250px] -translate-x-1/2 rounded-[48%_48%_38%_38%] bg-white/90 shadow-soft sm:top-16 sm:h-[420px] sm:w-[330px]" />
            <div className="absolute left-1/2 top-20 flex h-[260px] w-[260px] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-center text-white shadow-soft sm:top-24 sm:h-[360px] sm:w-[360px]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] opacity-80">EduAlto</p>
                <p className="mt-4 text-3xl font-bold sm:text-4xl">Học tập trực tuyến</p>
                <p className="mt-3 px-7 text-sm leading-6 opacity-90 sm:px-10">Khóa học, bài kiểm tra, tài liệu và tiến độ trong một không gian học tập.</p>
              </div>
            </div>
            <StatCard className="left-0 top-48 max-sm:hidden" title="Tìm nhanh" subtitle="Khóa học phù hợp" icon={<Search className="h-6 w-6" />} />
            <StatCard className="right-0 top-8 max-sm:hidden" title="Lộ trình" subtitle="Học theo từng chặng" icon={<BookOpen className="h-6 w-6" />} />
            <StatCard className="bottom-16 right-4 max-sm:hidden" title="Đánh giá" subtitle="Củng cố kiến thức" icon={<ClipboardCheck className="h-6 w-6" />} />
          </div>
        </div>

        <div className="container-page pb-14">
          <div className="grid gap-4 rounded-xl border border-footer-divider bg-white/80 p-5 shadow-xs sm:grid-cols-3">
            <SupportItem title="Học theo mục tiêu" description="Chọn khóa học phù hợp với nhu cầu hiện tại." />
            <SupportItem title="Theo dõi tiến độ" description="Nắm trạng thái học tập sau từng bài." />
            <SupportItem title="Tài liệu rõ ràng" description="Lưu trữ nội dung học trong cùng một nơi." />
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-base font-semibold text-primary">Có gì tại EduAlto</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight text-ink">Xây dựng môi trường học tập vui nhộn và hấp dẫn</h2>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </section>

      <section className="container-page py-8">
        <div>
          <p className="text-base font-semibold text-primary-dark">Khám phá EduAlto</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight text-ink">Khóa học phổ biến</h2>
          <p className="mt-5 text-xl leading-8 text-muted">
            Một số khóa học mẫu thể hiện cách EduAlto trình bày nội dung, lộ trình và hoạt động học tập.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {popularCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button variant="outline">Xem Tất Cả</Button>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Benefit({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatCard({ title, subtitle, icon, className }: { title: string; subtitle: string; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={`absolute flex items-center gap-4 rounded-xl border border-primary/30 bg-white p-4 shadow-soft ${className ?? ""}`}>
      {icon ? <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">{icon}</span> : null}
      <div>
        <p className="text-lg font-bold text-ink">{title}</p>
        <p className="text-sm text-ink/50">{subtitle}</p>
      </div>
    </div>
  );
}

function SupportItem({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
