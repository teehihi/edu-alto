import { BarChart3, BookOpen, Search, Users } from "lucide-react";
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
        <div className="container-page grid min-h-[760px] items-center gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div>
            <h1 className="max-w-3xl text-5xl font-bold capitalize leading-tight tracking-normal text-ink sm:text-6xl lg:text-[60px] lg:leading-[82px]">
              Nâng tầm <span className="text-primary">kỹ năng</span>
              <br />
              <span className="text-primary">bứt phá</span> sự nghiệp
            </h1>
            <p className="mt-5 max-w-xl text-base leading-[1.8] text-[#646464]">
              Nền tảng học tập trực tuyến hiện đại, cung cấp khóa học và tài liệu chất lượng giúp bạn nâng cao kiến thức và phát triển kỹ năng.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg">Khám phá ngay</Button>
              <Button size="lg" variant="secondary">
                Trải nghiệm miễn phí
              </Button>
            </div>
            <div className="mt-10 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
              <Benefit icon={<BookOpen className="h-5 w-5 text-feature-yellow" />} label="Nội Dung Đa Dạng" />
              <Benefit icon={<Users className="h-5 w-5 text-feature-coral" />} label="Học Tập Cá Nhân Hoá" />
              <Benefit icon={<BarChart3 className="h-5 w-5 text-feature-rose" />} label="Tiến Bộ Mỗi Ngày" />
            </div>
          </div>

          <div className="relative mx-auto h-[520px] w-full max-w-[560px]">
            <div className="absolute inset-x-8 top-8 aspect-square rounded-full border border-primary/40 bg-primary" />
            <div className="absolute left-1/2 top-16 h-[420px] w-[330px] -translate-x-1/2 rounded-[48%_48%_38%_38%] bg-white/90 shadow-soft" />
            <div className="absolute left-1/2 top-24 flex h-[360px] w-[360px] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-center text-white shadow-soft">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] opacity-80">EduAlto</p>
                <p className="mt-4 text-4xl font-bold">Học tập trực tuyến</p>
                <p className="mt-3 px-10 text-sm leading-6 opacity-90">Khóa học, bài kiểm tra, tài liệu và tiến độ trong một không gian học tập.</p>
              </div>
            </div>
            <StatCard className="left-0 top-48" title="2K+" subtitle="Video Khóa Học" icon={<Search className="h-6 w-6" />} />
            <StatCard className="right-0 top-8" title="5K+" subtitle="Khóa Học Trực Tuyến" />
            <StatCard className="bottom-16 right-4" title="250+" subtitle="Giảng Viên" icon={<Users className="h-6 w-6" />} />
          </div>
        </div>

        <div className="container-page flex flex-col gap-6 pb-14 sm:flex-row sm:items-center">
          <div className="text-3xl font-bold leading-9 text-primary">
            250+
            <span className="block text-2xl font-light text-ink">Đối Tác</span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-5 text-2xl font-bold text-slate-400 sm:grid-cols-4">
            <span>duolingo</span>
            <span>Codecov</span>
            <span>UserTesting</span>
            <span>magic leap</span>
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
            Hãy tham gia lớp học nổi tiếng của chúng tôi, kiến thức được cung cấp chắc chắn sẽ hữu ích cho bạn.
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
    <div className={`absolute flex items-center gap-4 rounded-[18px] border border-primary bg-[#f5f5f4] p-4 shadow-[0_18px_19px_rgba(0,0,0,0.15)] ${className ?? ""}`}>
      {icon ? <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">{icon}</span> : null}
      <div>
        <p className="text-2xl font-bold text-ink">{title}</p>
        <p className="text-sm text-ink/50">{subtitle}</p>
      </div>
    </div>
  );
}
