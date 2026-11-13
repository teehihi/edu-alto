#!/usr/bin/env bash
# ==============================================================================
# EduAlto ML Pipeline - Automated Continuous Retraining Script
# Tự động hóa trọn gói: Trích xuất Telemetry -> Feature Pipeline -> Huấn luyện LightGBM -> Báo cáo HTML
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

PYTHON_BIN="${ROOT_DIR}/.venv/bin/python"
if [ ! -f "${PYTHON_BIN}" ]; then
  PYTHON_BIN="$(which python3 || echo "")"
fi

if [ -z "${PYTHON_BIN}" ]; then
  echo "❌ Lỗi: Không tìm thấy môi trường Python!" >&2
  exit 1
fi

echo "================================================================================"
echo "🚀 EduAlto ML Continuous Retraining Pipeline Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================================================"

# 1. Trích xuất Telemetry mới nhất từ cơ sở dữ liệu nếu có kết nối
if [ -f "scripts/academic_pipeline/cli.py" ]; then
  echo "📊 [1/4] Đồng bộ Telemetry từ cơ sở dữ liệu..."
  "${PYTHON_BIN}" -m scripts.academic_pipeline.cli --help >/dev/null 2>&1 && "${PYTHON_BIN}" -m scripts.academic_pipeline.cli || echo "⚠️ Cảnh báo: Bỏ qua bước trích xuất trực tiếp từ DB, sử dụng snapshot dữ liệu hiện tại."
fi

# 2. Xử lý Feature Engineering chống rò rỉ dữ liệu
echo "⚙️ [2/4] Trích xuất 22 đặc trưng hành vi và phân chia tập Train / Test..."
"${PYTHON_BIN}" scripts/ml_pipeline/feature_pipeline.py

# 3. Huấn luyện lại và đánh giá mô hình LightGBM Champion
echo "🧠 [3/4] Huấn luyện mô hình học máy (LightGBM, Random Forest, Logistic Regression)..."
"${PYTHON_BIN}" scripts/ml_pipeline/train_and_evaluate.py

# 4. Cập nhật báo cáo trực quan hóa HTML
echo "📈 [4/4] Khởi tạo lại báo cáo trực quan hóa HTML..."
"${PYTHON_BIN}" scripts/ml_pipeline/generate_visual_report.py

echo "================================================================================"
echo "✅ Huấn luyện lại mô hình thành công: $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================================================"
exit 0
