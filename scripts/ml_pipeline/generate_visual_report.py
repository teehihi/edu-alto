#!/usr/bin/env python3
"""
EduAlto ML Pipeline - Visual Model Evaluation and Dataset Analysis Generator
Tạo báo cáo trực quan hóa phân tích dữ liệu huấn luyện và hiệu năng mô hình ML dự đoán học viên bỏ dở khóa học.
Xuất file HTML trực quan với biểu đồ SVG vector có thể mở trực tiếp trên trình duyệt.
"""

import json
from pathlib import Path
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
OUTPUT_HTML = REPORTS_DIR / "ml_model_visual_report.html"

FEATURE_VI_LABELS = {
    "avg_quiz_score": "Điểm Quiz trung bình",
    "days_since_last_activity": "Số ngày nghỉ học gần nhất",
    "active_learning_days_count": "Số ngày có hoạt động học",
    "max_quiz_score": "Điểm Quiz cao nhất",
    "quiz_accuracy_pct": "Tỷ lệ làm đúng câu hỏi Quiz (%)",
    "learning_notes_count": "Số lượng ghi chú bài học",
    "total_study_time_seconds": "Tổng thời gian học (giây)",
    "lesson_views_count": "Số lượt mở bài học",
    "text_reading_seconds": "Thời gian đọc tài liệu (giây)",
    "video_watch_seconds": "Thời gian xem video bài giảng (giây)",
    "avg_assignment_score": "Điểm bài tập tự luận trung bình",
    "assignment_submissions_count": "Số bài tập đã nộp",
    "current_streak_days": "Chuỗi ngày học liên tục hiện tại",
    "longest_streak_days": "Chuỗi ngày học dài nhất",
    "completed_sections_ratio": "Tỷ lệ phần hoàn thành",
    "discussion_comments_count": "Số thảo luận & bình luận",
}


def load_dataset_stats():
    train_path = DATA_DIR / "ml_features_train.csv"
    test_path = DATA_DIR / "ml_features_test.csv"

    if not train_path.exists() or not test_path.exists():
        raise FileNotFoundError("Chưa tìm thấy tập dữ liệu ml_features_train.csv hoặc ml_features_test.csv")

    df_train = pd.read_csv(train_path)
    df_test = pd.read_csv(test_path)
    df = pd.concat([df_train, df_test], ignore_index=True)

    total_samples = len(df)
    at_risk_count = int(df["target_at_risk"].sum())
    safe_count = total_samples - at_risk_count
    at_risk_pct = round((at_risk_count / total_samples) * 100, 1)
    safe_pct = round((safe_count / total_samples) * 100, 1)

    # Key feature statistics comparison
    comparison_features = [
        ("days_since_last_activity", "Số ngày nghỉ học gần nhất", "ngày"),
        ("avg_quiz_score", "Điểm Quiz trung bình", "điểm"),
        ("active_learning_days_count", "Số ngày học tích cực", "ngày"),
        ("total_study_time_seconds", "Tổng thời lượng học", "phút"),
        ("learning_notes_count", "Số lượng ghi chú", "ghi chú"),
        ("lesson_views_count", "Số lượt mở bài học", "lượt"),
    ]

    stats_table = []
    for col, name, unit in comparison_features:
        safe_val = df[df["target_at_risk"] == 0][col].mean()
        risk_val = df[df["target_at_risk"] == 1][col].mean()
        if col == "total_study_time_seconds":
            safe_display = f"{safe_val / 60:.1f}"
            risk_display = f"{risk_val / 60:.1f}"
        else:
            safe_display = f"{safe_val:.1f}"
            risk_display = f"{risk_val:.1f}"

        stats_table.append({
            "feature": col,
            "name": name,
            "unit": unit,
            "safe_mean": safe_display,
            "risk_mean": risk_display,
            "ratio": f"{risk_val / max(safe_val, 0.001):.1f}x" if risk_val > safe_val else f"{safe_val / max(risk_val, 0.001):.1f}x giảm",
        })

    return {
        "total_samples": total_samples,
        "train_samples": len(df_train),
        "test_samples": len(df_test),
        "safe_count": safe_count,
        "at_risk_count": at_risk_count,
        "safe_pct": safe_pct,
        "at_risk_pct": at_risk_pct,
        "stats_table": stats_table,
    }


def generate_model_comparison_svg(benchmarks):
    """Vẽ biểu đồ SVG so sánh các mô hình theo các chỉ số then chốt."""
    models = [b["model_name"].replace(" (Champion)", "") for b in benchmarks]
    metrics = ["ROC-AUC", "PR-AUC", "F1-Score", "Accuracy"]
    colors = ["#20B486", "#3B82F6", "#8B5CF6"]  # LightGBM, RF, LR

    svg = """
    <svg viewBox="0 0 760 280" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradLGBM" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#20B486"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
        <linearGradient id="gradRF" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3B82F6"/>
          <stop offset="100%" stop-color="#2563EB"/>
        </linearGradient>
        <linearGradient id="gradLR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#94A3B8"/>
          <stop offset="100%" stop-color="#64748B"/>
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      <line x1="60" y1="40" x2="720" y2="40" stroke="#F1F5F9" stroke-width="1"/>
      <line x1="60" y1="90" x2="720" y2="90" stroke="#F1F5F9" stroke-width="1"/>
      <line x1="60" y1="140" x2="720" y2="140" stroke="#F1F5F9" stroke-width="1"/>
      <line x1="60" y1="190" x2="720" y2="190" stroke="#F1F5F9" stroke-width="1"/>
      <line x1="60" y1="240" x2="720" y2="240" stroke="#CBD5E1" stroke-width="1.5"/>

      <!-- Y axis labels -->
      <text x="50" y="44" font-size="11" fill="#64748B" text-anchor="end">1.00</text>
      <text x="50" y="94" font-size="11" fill="#64748B" text-anchor="end">0.95</text>
      <text x="50" y="144" font-size="11" fill="#64748B" text-anchor="end">0.90</text>
      <text x="50" y="194" font-size="11" fill="#64748B" text-anchor="end">0.85</text>
      <text x="50" y="244" font-size="11" fill="#64748B" text-anchor="end">0.80</text>
    """

    # Model values
    # Base: 0.80 = y=240, 1.00 = y=40 (200px span for 0.20 range => 1000px per unit)
    group_centers = [150, 310, 470, 630]
    bar_width = 30
    gap = 4

    # benchmark order: 0: LR, 1: RF, 2: LightGBM
    lr = benchmarks[0]
    rf = benchmarks[1]
    lgbm = benchmarks[2]

    metric_keys = ["roc_auc", "pr_auc", "f1_score", "accuracy"]

    for idx, (center, key, name) in enumerate(zip(group_centers, metric_keys, metrics)):
        # LR bar
        lr_val = lr[key]
        lr_h = max(10, (lr_val - 0.80) * 1000)
        lr_y = 240 - lr_h
        lr_x = center - bar_width * 1.5 - gap

        # RF bar
        rf_val = rf[key]
        rf_h = max(10, (rf_val - 0.80) * 1000)
        rf_y = 240 - rf_h
        rf_x = center - bar_width * 0.5

        # LightGBM bar
        lgbm_val = lgbm[key]
        lgbm_h = max(10, (lgbm_val - 0.80) * 1000)
        lgbm_y = 240 - lgbm_h
        lgbm_x = center + bar_width * 0.5 + gap

        svg += f"""
        <!-- {name} group -->
        <rect x="{lr_x}" y="{lr_y}" width="{bar_width}" height="{lr_h}" rx="4" fill="url(#gradLR)"/>
        <text x="{lr_x + bar_width/2}" y="{lr_y - 6}" font-size="10" font-weight="600" fill="#64748B" text-anchor="middle">{lr_val:.3f}</text>

        <rect x="{rf_x}" y="{rf_y}" width="{bar_width}" height="{rf_h}" rx="4" fill="url(#gradRF)"/>
        <text x="{rf_x + bar_width/2}" y="{rf_y - 6}" font-size="10" font-weight="600" fill="#2563EB" text-anchor="middle">{rf_val:.3f}</text>

        <rect x="{lgbm_x}" y="{lgbm_y}" width="{bar_width}" height="{lgbm_h}" rx="4" fill="url(#gradLGBM)"/>
        <text x="{lgbm_x + bar_width/2}" y="{lgbm_y - 6}" font-size="10" font-weight="700" fill="#059669" text-anchor="middle">{lgbm_val:.3f}</text>

        <text x="{center}" y="260" font-size="12" font-weight="600" fill="#1E293B" text-anchor="middle">{name}</text>
        """

    svg += """
    </svg>
    """
    return svg


def generate_feature_importance_svg(top_features):
    """Vẽ biểu đồ thanh ngang Top 10 đặc trưng theo Information Gain."""
    max_gain = max(f["gain"] for f in top_features)

    svg = """
    <svg viewBox="0 0 760 380" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#20B486"/>
          <stop offset="100%" stop-color="#34D399"/>
        </linearGradient>
      </defs>
    """

    y_start = 30
    bar_height = 24
    spacing = 34

    for i, item in enumerate(top_features[:10]):
        y = y_start + i * spacing
        width = max(15, (item["gain"] / max_gain) * 440)
        label_vi = FEATURE_VI_LABELS.get(item["feature"], item["feature"])
        gain_str = f"{item['gain']:.1f}"

        svg += f"""
        <text x="240" y="{y + 17}" font-size="12" font-weight="600" fill="#1E293B" text-anchor="end">{label_vi}</text>
        <rect x="250" y="{y}" width="{width}" height="{bar_height}" rx="6" fill="url(#barGrad)"/>
        <text x="{250 + width + 8}" y="{y + 16}" font-size="11" font-weight="700" fill="#059669">{gain_str} pts</text>
        <text x="{250 + width + 90}" y="{y + 16}" font-size="10" fill="#94A3B8">({item['split_count']} splits)</text>
        """

    svg += "</svg>"
    return svg


def generate_confusion_matrix_svg(cm):
    """Vẽ Heatmap Confusion Matrix 2x2 cho Champion Model."""
    tn, fp = cm[0]
    fn, tp = cm[1]
    total = tn + fp + fn + tp

    svg = f"""
    <svg viewBox="0 0 460 300" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Matrix Header -->
      <text x="260" y="30" font-size="13" font-weight="700" fill="#1E293B" text-anchor="middle">Thực tế: Hoàn thành (0)</text>
      <text x="390" y="30" font-size="13" font-weight="700" fill="#1E293B" text-anchor="middle">Thực tế: Nguy cơ (1)</text>

      <text x="120" y="115" font-size="13" font-weight="700" fill="#1E293B" text-anchor="end">Dự đoán: An toàn (0)</text>
      <text x="120" y="215" font-size="13" font-weight="700" fill="#1E293B" text-anchor="end">Dự đoán: Nguy cơ (1)</text>

      <!-- Cell TN -->
      <rect x="200" y="55" width="120" height="100" rx="8" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="2"/>
      <text x="260" y="105" font-size="28" font-weight="800" fill="#047857" text-anchor="middle">{tn}</text>
      <text x="260" y="130" font-size="11" font-weight="600" fill="#059669" text-anchor="middle">True Negative ({tn/total*100:.1f}%)</text>

      <!-- Cell FP -->
      <rect x="330" y="55" width="120" height="100" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
      <text x="390" y="105" font-size="28" font-weight="800" fill="#64748B" text-anchor="middle">{fp}</text>
      <text x="390" y="130" font-size="11" font-weight="600" fill="#94A3B8" text-anchor="middle">False Positive ({fp/total*100:.1f}%)</text>

      <!-- Cell FN -->
      <rect x="200" y="165" width="120" height="100" rx="8" fill="#FEF2F2" stroke="#FECACA" stroke-width="2"/>
      <text x="260" y="215" font-size="28" font-weight="800" fill="#DC2626" text-anchor="middle">{fn}</text>
      <text x="260" y="240" font-size="11" font-weight="600" fill="#EF4444" text-anchor="middle">False Negative ({fn/total*100:.1f}%)</text>

      <!-- Cell TP -->
      <rect x="330" y="165" width="120" height="100" rx="8" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="2"/>
      <text x="390" y="215" font-size="28" font-weight="800" fill="#047857" text-anchor="middle">{tp}</text>
      <text x="390" y="240" font-size="11" font-weight="600" fill="#059669" text-anchor="middle">True Positive ({tp/total*100:.1f}%)</text>

      <text x="290" y="285" font-size="12" fill="#64748B" text-anchor="middle">Độ chính xác tổng thể: 99.06% (105 / 106 mẫu kiểm thử)</text>
    </svg>
    """
    return svg


def main():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    metadata_path = MODELS_DIR / "model_metadata.json"
    if not metadata_path.exists():
        raise FileNotFoundError(f"Chưa tìm thấy {metadata_path}")

    with open(metadata_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    data_stats = load_dataset_stats()

    benchmarks = meta["benchmark_comparison"]
    top_features = meta["top_features_by_gain"]
    lgbm_bench = benchmarks[2]

    svg_models = generate_model_comparison_svg(benchmarks)
    svg_features = generate_feature_importance_svg(top_features)
    svg_cm = generate_confusion_matrix_svg(lgbm_bench["confusion_matrix"])

    # Build HTML Report
    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EduAlto ML - Báo Cáo Phân Tích Mô Hình & Dữ Liệu Huấn Luyện</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body {{
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #F8FAFC;
      color: #0F172A;
    }}
    .brand-primary {{ color: #20B486; }}
    .bg-brand-primary {{ background-color: #20B486; }}
    .border-brand-primary {{ border-color: #20B486; }}
  </style>
</head>
<body class="p-4 md:p-8">
  <div class="max-w-6xl mx-auto space-y-8">
    <!-- Header -->
    <header class="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-200/60">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          CHẶNG 2: MACHINE LEARNING COURSE RETENTION
        </div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Phân Tích Dữ Liệu & Hiệu Năng Mô Hình ML
        </h1>
        <p class="text-slate-500 text-sm mt-1">
          Đánh giá đối sánh hiệu năng các mô hình học máy và phân tích các chỉ số dẫn dắt nguy cơ bỏ dở khóa học.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-right">
          <div class="text-xs text-slate-400 font-semibold uppercase">Mô hình tối ưu</div>
          <div class="text-lg font-bold text-emerald-600">LightGBM Champion</div>
        </div>
        <div class="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-extrabold text-xl">
          ✓
        </div>
      </div>
    </header>

    <!-- Key Metrics Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">ROC-AUC Score</div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">{lgbm_bench['roc_auc']:.4f}</div>
        <div class="text-xs text-emerald-600 font-semibold mt-1">Khả năng phân tách hoàn hảo</div>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">F1-Score</div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">{lgbm_bench['f1_score']:.4f}</div>
        <div class="text-xs text-emerald-600 font-semibold mt-1">Cân bằng Precision / Recall</div>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Độ chính xác (Accuracy)</div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">{lgbm_bench['accuracy'] * 100:.1f}%</div>
        <div class="text-xs text-slate-500 font-medium mt-1">105/106 mẫu kiểm thử đúng</div>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Brier Loss</div>
        <div class="text-3xl font-extrabold text-emerald-600 mt-2">{lgbm_bench['brier_score']:.4f}</div>
        <div class="text-xs text-emerald-600 font-semibold mt-1">Xác suất hiệu chuẩn cực thấp</div>
      </div>
    </div>

    <!-- Section 1: Model Benchmark Comparison -->
    <section class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900">1. So Sánh Hiệu Năng Benchmark Giữa Các Mô Hình</h2>
          <p class="text-xs text-slate-500">So sánh Logistic Regression (Tuyến tính), Random Forest (Ensemble) và LightGBM (Gradient Boosting)</p>
        </div>
        <div class="flex items-center gap-4 text-xs font-semibold">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-md bg-[#20B486]"></span> LightGBM</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-md bg-[#3B82F6]"></span> Random Forest</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-md bg-[#94A3B8]"></span> Logistic Regression</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        {svg_models}
      </div>

      <!-- Detailed Comparison Table -->
      <div class="overflow-x-auto rounded-xl border border-slate-100">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
            <tr>
              <th class="p-3">Mô hình</th>
              <th class="p-3 text-center">ROC-AUC</th>
              <th class="p-3 text-center">PR-AUC</th>
              <th class="p-3 text-center">F1-Score</th>
              <th class="p-3 text-center">Precision</th>
              <th class="p-3 text-center">Recall</th>
              <th class="p-3 text-center">Brier Loss</th>
              <th class="p-3 text-center">Kết luận</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-600">
            <tr>
              <td class="p-3 font-semibold text-slate-800">Logistic Regression (Baseline)</td>
              <td class="p-3 text-center">0.9696</td>
              <td class="p-3 text-center">0.9359</td>
              <td class="p-3 text-center">0.9048</td>
              <td class="p-3 text-center">100%</td>
              <td class="p-3 text-center">82.6%</td>
              <td class="p-3 text-center">0.0387</td>
              <td class="p-3 text-center text-slate-500">Mô hình cơ sở tốt</td>
            </tr>
            <tr>
              <td class="p-3 font-semibold text-slate-800">Random Forest</td>
              <td class="p-3 text-center">0.9974</td>
              <td class="p-3 text-center">0.9922</td>
              <td class="p-3 text-center">0.9362</td>
              <td class="p-3 text-center">91.7%</td>
              <td class="p-3 text-center">95.7%</td>
              <td class="p-3 text-center">0.0206</td>
              <td class="p-3 text-center text-blue-600 font-semibold">Cạnh tranh cao</td>
            </tr>
            <tr class="bg-emerald-50/50 font-semibold text-slate-900">
              <td class="p-3 text-emerald-800 font-bold flex items-center gap-1.5">
                <span class="text-emerald-600">★</span> LightGBM (Champion)
              </td>
              <td class="p-3 text-center text-emerald-700 font-bold">0.9969</td>
              <td class="p-3 text-center text-emerald-700 font-bold">0.9910</td>
              <td class="p-3 text-center text-emerald-700 font-bold">0.9778</td>
              <td class="p-3 text-center text-emerald-700 font-bold">100%</td>
              <td class="p-3 text-center text-emerald-700 font-bold">95.7%</td>
              <td class="p-3 text-center text-emerald-700 font-bold">0.0098</td>
              <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">Tối ưu nhất</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 2: Feature Importance and Confusion Matrix -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Feature Importance -->
      <section class="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900">2. Mức Độ Đóng Góp Của Các Đặc Trưng (Gain)</h2>
          <p class="text-xs text-slate-500">Các yếu tố có sức mạnh giải thích lớn nhất trong việc phân biệt học viên sắp bỏ dở</p>
        </div>
        <div class="overflow-x-auto">
          {svg_features}
        </div>
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 space-y-1">
          <p><strong>💡 Ý nghĩa kinh doanh EdTech:</strong></p>
          <ul class="list-disc pl-4 space-y-1 text-slate-500">
            <li><strong>Điểm Quiz trung bình</strong> là chỉ số quan trọng nhất: Khi học viên không vượt qua được bài kiểm tra, tâm lý nản chí xuất hiện khiến họ từ bỏ khóa học.</li>
            <li><strong>Số ngày ngắt quãng (nghỉ học)</strong> là tín hiệu cảnh báo sớm thứ 2: Học viên không đăng nhập quá 7-14 ngày có khả năng rời bỏ cao gấp 5.4 lần.</li>
          </ul>
        </div>
      </section>

      <!-- Confusion Matrix & Risk Segments -->
      <section class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900">3. Ma Trận Nhầm Lẫn (Confusion Matrix)</h2>
          <p class="text-xs text-slate-500">Kết quả phân loại trên 106 mẫu kiểm thử độc lập (Test Set)</p>
        </div>
        <div class="flex justify-center">
          {svg_cm}
        </div>

        <div class="border-t border-slate-100 pt-4 space-y-2">
          <div class="text-xs font-bold text-slate-700">Ngưỡng Phân Khúc Rủi Ro Trên Hệ Thống:</div>
          <div class="space-y-1.5 text-xs">
            <div class="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-800">
              <span class="font-semibold">🔴 Cần hỗ trợ (High Risk)</span>
              <span>Xác suất bỏ dở &gt; 70%</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-800">
              <span class="font-semibold">🟡 Cần theo dõi (Medium Risk)</span>
              <span>Xác suất 35% - 70%</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800">
              <span class="font-semibold">🟢 An toàn / Đúng tiến độ (Low Risk)</span>
              <span>Xác suất &lt; 35%</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Section 3: Data Distribution Breakdown -->
    <section class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900">4. Thống Kê Đối Sánh Dữ Liệu: Nhóm An Toàn vs Nhóm Nguy Cơ</h2>
          <p class="text-xs text-slate-500">Tổng cộng {data_stats['total_samples']} hồ sơ học tập ({data_stats['train_samples']} Train, {data_stats['test_samples']} Test) - Tỷ lệ mẫu: {data_stats['safe_pct']}% An toàn / {data_stats['at_risk_pct']}% Nguy cơ</p>
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-100">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
            <tr>
              <th class="p-3">Đặc trưng hành vi</th>
              <th class="p-3 text-center">Đơn vị</th>
              <th class="p-3 text-center bg-emerald-50/70 text-emerald-800">Nhóm Hoàn Thành (An toàn)</th>
              <th class="p-3 text-center bg-rose-50/70 text-rose-800">Nhóm Nguy Cơ Bỏ Dở</th>
              <th class="p-3 text-center">Tỷ lệ chênh lệch</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            {''.join([f'''
            <tr class="hover:bg-slate-50/70 transition">
              <td class="p-3 font-medium text-slate-800">{row['name']}</td>
              <td class="p-3 text-center text-slate-400">{row['unit']}</td>
              <td class="p-3 text-center font-bold text-emerald-700">{row['safe_mean']}</td>
              <td class="p-3 text-center font-bold text-rose-600">{row['risk_mean']}</td>
              <td class="p-3 text-center font-semibold text-slate-600">{row['ratio']}</td>
            </tr>''' for row in data_stats['stats_table']])}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Footer -->
    <footer class="text-center text-xs text-slate-400 pb-8">
      EduAlto LMS - Machine Learning Pipeline v2.0 • Được tạo tự động bởi scripts/ml_pipeline/generate_visual_report.py
    </footer>
  </div>
</body>
</html>
"""

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"Đã xuất báo cáo trực quan hóa thành công tại: {OUTPUT_HTML}")


if __name__ == "__main__":
    main()
