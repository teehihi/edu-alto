"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/auth-client";
import {
  createAdminUser,
  fetchAdminUsers,
  resetAdminUserPassword,
  updateAdminUserRoles,
  updateAdminUserStatus,
  type AdminUserItem,
} from "@/lib/admin-client";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const roleBadges: Record<string, { label: string; className: string }> = {
  ADMIN: {
    label: "Quản trị viên",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  INSTRUCTOR: {
    label: "Giảng viên",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  STUDENT: {
    label: "Học viên",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const statusBadges: Record<string, { label: string; className: string; icon: typeof CheckCircle }> =
  {
    ACTIVE: {
      label: "Hoạt động",
      className: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: CheckCircle,
    },
    PENDING_VERIFICATION: {
      label: "Chờ kích hoạt",
      className: "text-amber-700 bg-amber-50 border-amber-200",
      icon: Clock,
    },
    LOCKED: {
      label: "Đã khóa",
      className: "text-rose-700 bg-rose-50 border-rose-200",
      icon: Lock,
    },
    DISABLED: {
      label: "Vô hiệu hóa",
      className: "text-slate-600 bg-slate-100 border-slate-200",
      icon: UserX,
    },
  };

export function AdminUsersPage() {
  const { getAccessToken, user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [totalElements, setTotalElements] = useState<number>(0);

  // Notification feedback
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<AdminUserItem | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUserItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetchAdminUsers(token, 0, 50, searchKeyword, selectedRole);
      if (res && Array.isArray(res.data)) {
        setUsers(res.data);
        setTotalElements(res.meta?.totalElements ?? res.data.length);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, searchKeyword, selectedRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all ${
            toastMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === "success" ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            )}
            <p className="text-sm font-medium">{toastMessage.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="rounded-lg p-1 text-slate-500 hover:bg-black/5"
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">Người dùng & Giảng viên</h2>
          <p className="mt-1 text-sm text-muted">
            Quản trị danh sách tài khoản, phân quyền vai trò và kiểm soát trạng thái thành viên toàn
            hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="focus-ring flex items-center gap-2 bg-primary font-semibold text-white hover:bg-[#159e75]"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm người dùng</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadUsers()}
            className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Tìm theo họ tên hoặc email người dùng thực..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-sm text-heading placeholder:text-slate-400 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="focus-ring rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="INSTRUCTOR">Giảng viên</option>
            <option value="STUDENT">Học viên</option>
          </select>

          <span className="text-xs font-semibold text-muted">
            Tổng cộng: <strong>{totalElements}</strong> thành viên
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Thành viên</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Hoạt động</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Ngày tham gia</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary mb-2" />
                    Đang tải dữ liệu người dùng thực...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted">
                    Không tìm thấy thành viên nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const statusInfo = statusBadges[u.status] || {
                    label: u.status,
                    className: "text-slate-700 bg-slate-100 border-slate-200",
                    icon: Clock,
                  };
                  const StatusIcon = statusInfo.icon;
                  const isCurrentAdminSelf = currentAdmin?.id === u.id;

                  return (
                    <tr key={u.id} className="transition hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={u.fullName}
                            email={u.email}
                            avatarUrl={u.avatarUrl}
                            size="sm"
                            className="h-9 w-9 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-heading truncate">{u.fullName}</p>
                              {isCurrentAdminSelf && (
                                <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {u.roles && u.roles.length > 0 ? (
                            u.roles.map((r) => {
                              const badge = roleBadges[r] || {
                                label: r,
                                className: "bg-slate-100 text-slate-700 border-slate-200",
                              };
                              return (
                                <span
                                  key={r}
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted">Chưa gán</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted">
                        {u.roles?.includes("INSTRUCTOR") ? (
                          <span>
                            Giảng dạy: <strong>{u.teachingCoursesCount}</strong> khóa
                          </span>
                        ) : u.roles?.includes("STUDENT") ? (
                          <span>
                            Ghi danh: <strong>{u.enrolledCoursesCount}</strong> khóa
                          </span>
                        ) : (
                          <span>Toàn quyền hệ thống</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRoleModalUser(u)}
                            className="focus-ring inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/60 px-2.5 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                            title="Phân quyền vai trò"
                          >
                            <Shield className="h-3.5 w-3.5" />
                            <span>Phân quyền</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatusModalUser(u)}
                            disabled={isCurrentAdminSelf}
                            className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title={
                              isCurrentAdminSelf
                                ? "Không thể khóa tài khoản của chính mình"
                                : "Thay đổi trạng thái tài khoản"
                            }
                          >
                            <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                            <span>Trạng thái</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPasswordModalUser(u)}
                            className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-50 hover:text-heading"
                            title="Đặt lại mật khẩu"
                            aria-label="Đặt lại mật khẩu"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {roleModalUser && (
        <RoleModal
          user={roleModalUser}
          isCurrentAdminSelf={currentAdmin?.id === roleModalUser.id}
          onClose={() => setRoleModalUser(null)}
          onSuccess={(updatedRoles) => {
            setUsers((prev) =>
              prev.map((item) =>
                item.id === roleModalUser.id
                  ? { ...item, roles: updatedRoles as ("ADMIN" | "INSTRUCTOR" | "STUDENT")[] }
                  : item,
              ),
            );
            setRoleModalUser(null);
            showToast("success", `Đã cập nhật phân quyền cho tài khoản ${roleModalUser.fullName}`);
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}

      {/* Status Modal */}
      {statusModalUser && (
        <StatusModal
          user={statusModalUser}
          onClose={() => setStatusModalUser(null)}
          onSuccess={(newStatus) => {
            setUsers((prev) =>
              prev.map((item) =>
                item.id === statusModalUser.id
                  ? {
                      ...item,
                      status: newStatus as
                        | "ACTIVE"
                        | "PENDING_VERIFICATION"
                        | "LOCKED"
                        | "DISABLED",
                    }
                  : item,
              ),
            );
            setStatusModalUser(null);
            showToast(
              "success",
              `Đã cập nhật trạng thái cho tài khoản ${statusModalUser.fullName}`,
            );
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}

      {/* Create User Modal */}
      {createModalOpen && (
        <CreateUserModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={(created) => {
            setUsers((prev) => [created, ...prev]);
            setTotalElements((prev) => prev + 1);
            setCreateModalOpen(false);
            showToast("success", `Tạo thành công người dùng mới: ${created.fullName}`);
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}

      {/* Reset Password Modal */}
      {passwordModalUser && (
        <ResetPasswordModal
          user={passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          onSuccess={() => {
            setPasswordModalUser(null);
            showToast("success", `Đã đặt lại mật khẩu mới cho ${passwordModalUser.fullName}`);
          }}
          onError={(msg) => showToast("error", msg)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Role Management Modal
// -------------------------------------------------------------------------
function RoleModal({
  user,
  isCurrentAdminSelf,
  onClose,
  onSuccess,
  onError,
}: {
  user: AdminUserItem;
  isCurrentAdminSelf: boolean;
  onClose: () => void;
  onSuccess: (roles: string[]) => void;
  onError: (msg: string) => void;
}) {
  const { getAccessToken } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles || []);
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length === 1) {
        onError("Người dùng phải có ít nhất một vai trò!");
        return;
      }
      if (isCurrentAdminSelf && role === "ADMIN") {
        onError("Bạn không thể tự thu hồi vai trò Quản trị viên của chính mình!");
        return;
      }
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      onError("Vui lòng chọn ít nhất một vai trò");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Chưa đăng nhập");
      await updateAdminUserRoles(token, user.id, selectedRoles);
      onSuccess(selectedRoles);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không thể cập nhật phân quyền cho người dùng";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-backdrop-fade"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-modal-zoom">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 id="role-modal-title" className="text-base font-bold text-heading">
                Phân quyền tài khoản
              </h3>
              <p className="text-xs text-muted truncate max-w-[260px]">
                {user.fullName} ({user.email})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="my-5 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Chọn các vai trò áp dụng:
          </p>

          {/* ADMIN option */}
          <label className="focus-within:ring-2 focus-within:ring-primary flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selectedRoles.includes("ADMIN")}
              onChange={() => toggleRole("ADMIN")}
              disabled={isCurrentAdminSelf}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <div className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-700">Quản trị viên (ADMIN)</span>
                {isCurrentAdminSelf && (
                  <span className="text-[10px] text-muted">(Không thể thu hồi tài khoản này)</span>
                )}
              </div>
              <p className="mt-0.5 text-slate-500">
                Toàn quyền truy cập bảng quản trị, phê duyệt khóa học, đối soát thanh toán và phân
                quyền thành viên.
              </p>
            </div>
          </label>

          {/* INSTRUCTOR option */}
          <label className="focus-within:ring-2 focus-within:ring-primary flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selectedRoles.includes("INSTRUCTOR")}
              onChange={() => toggleRole("INSTRUCTOR")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <div className="text-xs">
              <span className="font-bold text-blue-700">Giảng viên (INSTRUCTOR)</span>
              <p className="mt-0.5 text-slate-500">
                Truy cập cổng giảng viên, tạo và quản lý khóa học, bài học video/tài liệu và quản lý
                học viên.
              </p>
            </div>
          </label>

          {/* STUDENT option */}
          <label className="focus-within:ring-2 focus-within:ring-primary flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selectedRoles.includes("STUDENT")}
              onChange={() => toggleRole("STUDENT")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800">Học viên (STUDENT)</span>
              <p className="mt-0.5 text-slate-500">
                Ghi danh các khóa học trực tuyến, xem bài giảng, làm bài trắc nghiệm và thảo luận
                học tập.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting}
            className="focus-ring bg-primary font-semibold text-white hover:bg-[#159e75]"
          >
            {submitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu phân quyền"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// User Status Modal
// -------------------------------------------------------------------------
function StatusModal({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: AdminUserItem;
  onClose: () => void;
  onSuccess: (status: string) => void;
  onError: (msg: string) => void;
}) {
  const { getAccessToken } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>(user.status);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Chưa đăng nhập");
      await updateAdminUserStatus(token, user.id, selectedStatus);
      onSuccess(selectedStatus);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái người dùng";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-backdrop-fade"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-modal-zoom">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 id="status-modal-title" className="text-base font-bold text-heading">
                Thay đổi trạng thái tài khoản
              </h3>
              <p className="text-xs text-muted truncate max-w-[260px]">{user.fullName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="my-5 space-y-3">
          <label className="block text-xs font-semibold text-slate-600">
            Chọn trạng thái hoạt động:
          </label>
          <div className="space-y-2">
            {[
              {
                id: "ACTIVE",
                label: "Hoạt động (ACTIVE)",
                desc: "Cho phép đăng nhập và sử dụng toàn bộ tính năng bình thường",
              },
              {
                id: "LOCKED",
                label: "Tạm khóa (LOCKED)",
                desc: "Ngăn chặn đăng nhập vào hệ thống khi phát hiện vi phạm",
              },
              {
                id: "DISABLED",
                label: "Vô hiệu hóa (DISABLED)",
                desc: "Ngừng kích hoạt tài khoản",
              },
              {
                id: "PENDING_VERIFICATION",
                label: "Chờ xác thực (PENDING_VERIFICATION)",
                desc: "Chưa hoàn tất kích hoạt qua email",
              },
            ].map((st) => (
              <label
                key={st.id}
                className="focus-within:ring-2 focus-within:ring-primary flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="status"
                  value={st.id}
                  checked={selectedStatus === st.id}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="mt-0.5 h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                />
                <div className="text-xs">
                  <p className="font-semibold text-heading">{st.label}</p>
                  <p className="text-slate-500">{st.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting}
            className="focus-ring bg-primary font-semibold text-white hover:bg-[#159e75]"
          >
            {submitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Cập nhật trạng thái"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Create User Modal
// -------------------------------------------------------------------------
function CreateUserModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: (user: AdminUserItem) => void;
  onError: (msg: string) => void;
}) {
  const { getAccessToken } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["STUDENT"]);
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length === 1) {
        onError("Người dùng phải có ít nhất một vai trò!");
        return;
      }
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      onError("Vui lòng nhập họ và tên");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      onError("Vui lòng nhập email hợp lệ");
      return;
    }
    if (!password.trim() || password.length < 6) {
      onError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (selectedRoles.length === 0) {
      onError("Vui lòng chọn ít nhất một vai trò");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Chưa đăng nhập");
      const created = await createAdminUser(token, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        roles: selectedRoles,
      });
      onSuccess(created);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tạo tài khoản mới";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-backdrop-fade"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-modal-zoom">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 id="create-modal-title" className="text-base font-bold text-heading">
                Thêm người dùng mới
              </h3>
              <p className="text-xs text-muted">
                Tạo tài khoản và gán vai trò trực tiếp vào hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="my-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-heading placeholder:text-slate-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Email đăng nhập <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-heading placeholder:text-slate-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Mật khẩu khởi tạo <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-heading placeholder:text-slate-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phân quyền ban đầu:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "STUDENT", label: "Học viên", color: "text-slate-700" },
                { id: "INSTRUCTOR", label: "Giảng viên", color: "text-blue-700" },
                { id: "ADMIN", label: "Quản trị viên", color: "text-purple-700" },
              ].map((r) => {
                const checked = selectedRoles.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`focus-ring flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                      checked
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="focus-ring bg-primary font-semibold text-white hover:bg-[#159e75]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo tài khoản"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Reset Password Modal
// -------------------------------------------------------------------------
function ResetPasswordModal({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: AdminUserItem;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const { getAccessToken } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      onError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Chưa đăng nhập");
      await resetAdminUserPassword(token, user.id, newPassword.trim());
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể đặt lại mật khẩu";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-backdrop-fade"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-modal-zoom">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 id="password-modal-title" className="text-base font-bold text-heading">
                Đặt lại mật khẩu
              </h3>
              <p className="text-xs text-muted truncate max-w-[260px]">
                {user.fullName} ({user.email})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="my-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-heading placeholder:text-slate-400 focus:bg-white"
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              Lưu ý bảo mật
            </div>
            <p className="mt-1 leading-relaxed text-amber-700">
              Mật khẩu sẽ được mã hóa và cập nhật ngay lập tức. Hãy thông báo cho người dùng mật
              khẩu mới này một cách an toàn.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="focus-ring bg-primary font-semibold text-white hover:bg-[#159e75]"
            >
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                "Xác nhận đổi mật khẩu"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
