"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Database,
  KeyRound,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-client";
import {
  fetchAdminPermissions,
  fetchAdminRoles,
  updateAdminRolePermissions,
  type AdminPermission,
  type AdminRoleDetail,
} from "@/lib/admin-client";

const roleMeta: Record<
  string,
  { label: string; badgeClass: string; icon: typeof Shield; colorClass: string }
> = {
  ADMIN: {
    label: "Quản trị viên",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    colorClass: "from-purple-500 to-indigo-600",
    icon: ShieldAlert,
  },
  INSTRUCTOR: {
    label: "Giảng viên",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    colorClass: "from-emerald-500 to-teal-600",
    icon: ShieldCheck,
  },
  STUDENT: {
    label: "Học viên",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    colorClass: "from-blue-500 to-cyan-600",
    icon: Shield,
  },
};

const methodBadgeClasses: Record<string, string> = {
  GET: "bg-blue-50 text-blue-700 border-blue-200",
  POST: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  PATCH: "bg-orange-50 text-orange-700 border-orange-200",
  DELETE: "bg-rose-50 text-rose-700 border-rose-200",
};

const moduleLabels: Record<string, string> = {
  ADMIN: "Quản trị hệ thống (Admin)",
  INSTRUCTOR: "Giảng viên & Khóa học",
  STUDENT: "Học tập & Học viên",
  COMMERCE: "Thương mại & Doanh thu",
};

export function AdminRolesPage() {
  const { getAccessToken } = useAuth();
  const [roles, setRoles] = useState<AdminRoleDetail[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal / Drawer state for configuring permissions
  const [selectedRole, setSelectedRole] = useState<AdminRoleDetail | null>(null);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<Set<string>>(new Set());
  const [roleDescription, setRoleDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const [rolesRes, permsRes] = await Promise.all([
        fetchAdminRoles(token),
        fetchAdminPermissions(token),
      ]);

      if (Array.isArray(rolesRes)) {
        setRoles(rolesRes);
      }
      if (Array.isArray(permsRes)) {
        setPermissions(permsRes);
      }
    } catch {
      showToast("error", "Không thể tải danh sách vai trò hoặc quyền hạn.");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenConfig = (role: AdminRoleDetail) => {
    setSelectedRole(role);
    setRoleDescription(role.description ?? "");
    setAssignedPermissionIds(new Set(role.permissions.map((p) => p.id)));
    setSearchQuery("");
    setSelectedModule("ALL");
  };

  const handleCloseConfig = () => {
    setSelectedRole(null);
    setSaving(false);
  };

  const handleTogglePermission = (permissionId: string) => {
    setAssignedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const handleToggleModule = (modulePerms: AdminPermission[], allChecked: boolean) => {
    setAssignedPermissionIds((prev) => {
      const next = new Set(prev);
      for (const p of modulePerms) {
        if (allChecked) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      }
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      await updateAdminRolePermissions(token, selectedRole.id, {
        description: roleDescription,
        permissionIds: Array.from(assignedPermissionIds),
      });

      showToast("success", `Cập nhật phân quyền cho vai trò ${selectedRole.name} thành công.`);
      handleCloseConfig();
      await loadData();
    } catch {
      showToast("error", "Không thể cập nhật quyền hạn. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const configurableRoles = useMemo(() => roles.filter((r) => r.name !== "ADMIN"), [roles]);

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    const map = new Map<string, AdminPermission[]>();
    for (const p of permissions) {
      if (!map.has(p.module)) {
        map.set(p.module, []);
      }
      map.get(p.module)?.push(p);
    }
    return map;
  }, [permissions]);

  // Filtered modules & permissions for modal
  const filteredPermissionsByModule = useMemo(() => {
    const result = new Map<string, AdminPermission[]>();
    const query = searchQuery.trim().toLowerCase();

    for (const [module, perms] of permissionsByModule.entries()) {
      if (selectedModule !== "ALL" && selectedModule !== module) {
        continue;
      }
      const filtered = perms.filter((p) => {
        if (!query) return true;
        return (
          p.name.toLowerCase().includes(query) ||
          p.apiPath.toLowerCase().includes(query) ||
          p.method.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
        );
      });
      if (filtered.length > 0) {
        result.set(module, filtered);
      }
    }
    return result;
  }, [permissionsByModule, searchQuery, selectedModule]);

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

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Vai trò & Phân quyền hệ thống
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cơ chế Dynamic RBAC kết hợp Spring Security Filter và Redis Cache để phân quyền theo
            từng API endpoint.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="gap-2 focus-ring"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Số vai trò hệ thống</span>
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
              <Shield className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{configurableRoles.length}</span>
            <span className="ml-2 text-xs text-slate-500">vai trò phân quyền</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Tổng quyền API (Permissions)</span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{permissions.length}</span>
            <span className="ml-2 text-xs text-slate-500">quyền hạn tài nguyên</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Kiểm soát an ninh</span>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-base font-bold text-slate-900">Redis Cache & Filter</span>
            <p className="mt-0.5 text-xs text-slate-500">
              So khớp AntPathMatcher theo từng request
            </p>
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Danh mục vai trò phân quyền</h2>
          <p className="text-xs text-slate-500">
            Quản trị viên (ADMIN) mặc định luôn sở hữu toàn bộ đặc quyền hệ thống nên được bảo vệ cố
            định.
          </p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {configurableRoles.map((role) => {
              const meta = roleMeta[role.name] ?? {
                label: role.name,
                badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                colorClass: "from-slate-500 to-slate-700",
                icon: Shield,
              };
              const RoleIcon = meta.icon;
              const permCount = role.permissions?.length ?? 0;

              return (
                <div
                  key={role.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`rounded-xl bg-gradient-to-br ${meta.colorClass} p-2.5 text-white shadow-sm`}
                        >
                          <RoleIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{meta.label}</h3>
                          <span className="font-mono text-xs text-slate-400">{role.name}</span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                      >
                        {role.name}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-2 min-h-[40px] text-sm text-slate-600">
                      {role.description || "Chưa có mô tả chi tiết cho vai trò này."}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-xs">
                          <strong className="font-semibold text-slate-900">{role.userCount}</strong>{" "}
                          thành viên
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <KeyRound className="h-4 w-4 text-slate-400" />
                        <span className="text-xs">
                          <strong className="font-semibold text-slate-900">{permCount}</strong> /{" "}
                          {permissions.length} quyền
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-2">
                    <Button
                      onClick={() => handleOpenConfig(role)}
                      className="w-full gap-2 focus-ring"
                      variant="outline"
                    >
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Cấu hình quyền hạn
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Configuration Modal / Drawer */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Phân quyền vai trò: {roleMeta[selectedRole.name]?.label ?? selectedRole.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chọn các quyền hạn API mà vai trò này được phép truy cập trong hệ thống.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseConfig}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {/* Description Input */}
              <div>
                <label
                  htmlFor="role-desc"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Mô tả vai trò
                </label>
                <input
                  id="role-desc"
                  type="text"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Nhập mô tả chức năng của vai trò..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-ring"
                />
              </div>

              {/* Filter & Search Toolbar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên quyền, API path (/api/v1/...) hoặc mô tả..."
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-sm placeholder:text-slate-400 focus-ring"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Module:</span>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus-ring"
                  >
                    <option value="ALL">Tất cả module</option>
                    {Array.from(permissionsByModule.keys()).map((mod) => (
                      <option key={mod} value={mod}>
                        {moduleLabels[mod] ?? mod}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permission Matrix grouped by Module */}
              <div className="space-y-6">
                {Array.from(filteredPermissionsByModule.entries()).map(
                  ([moduleName, modulePerms]) => {
                    const checkedCount = modulePerms.filter((p) =>
                      assignedPermissionIds.has(p.id),
                    ).length;
                    const allChecked =
                      checkedCount === modulePerms.length && modulePerms.length > 0;

                    return (
                      <div
                        key={moduleName}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        {/* Module Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-slate-900">
                              {moduleLabels[moduleName] ?? moduleName}
                            </span>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {checkedCount} / {modulePerms.length} đã chọn
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleModule(modulePerms, allChecked)}
                            className="h-8 text-xs font-medium text-primary hover:text-primary-dark"
                          >
                            {allChecked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                          </Button>
                        </div>

                        {/* Permissions List */}
                        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {modulePerms.map((perm) => {
                            const isChecked = assignedPermissionIds.has(perm.id);
                            const methodClass =
                              methodBadgeClasses[perm.method] ?? "bg-slate-100 text-slate-700";

                            return (
                              <label
                                key={perm.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                                  isChecked
                                    ? "border-primary/40 bg-white shadow-xs ring-1 ring-primary/20"
                                    : "border-slate-200/80 bg-white hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${methodClass}`}
                                    >
                                      {perm.method}
                                    </span>
                                    <span className="truncate font-medium text-slate-900 text-xs">
                                      {perm.name}
                                    </span>
                                  </div>
                                  <p
                                    className="mt-1 font-mono text-[11px] text-slate-500 truncate"
                                    title={perm.apiPath}
                                  >
                                    {perm.apiPath}
                                  </p>
                                  {perm.description && (
                                    <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  },
                )}

                {filteredPermissionsByModule.size === 0 && (
                  <div className="py-12 text-center">
                    <Search className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Không tìm thấy quyền nào phù hợp
                    </p>
                    <p className="text-xs text-slate-400">
                      Hãy thử thay đổi từ khóa hoặc bộ lọc module.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <div className="text-xs text-slate-500">
                Đã chọn{" "}
                <strong className="font-semibold text-slate-900">
                  {assignedPermissionIds.size}
                </strong>{" "}
                quyền hạn cho vai trò này.
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseConfig}
                  disabled={saving}
                  className="focus-ring"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="gap-2 focus-ring"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? "Đang lưu..." : "Lưu thay đổi phân quyền"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
