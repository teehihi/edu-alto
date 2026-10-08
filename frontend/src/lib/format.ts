export function formatVND(value: number): string {
  return value === 0 ? "Miễn phí" : `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

export function formatVNDAmount(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}
