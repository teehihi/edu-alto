"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Clock, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/features/auth/auth-client";
import { fetchAdminUsers, type AdminUserItem } from "@/lib/admin-client";

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

export function AdminUsersPage() {
  const { getAccessToken } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [totalElements, setTotalElements] = useState<number>(0);

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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">Người dùng & Giảng viên</h2>
          <p className="mt-1 text-sm text-muted">
            Quản trị danh sách tài khoản, vai trò và trạng thái kích hoạt thực tế từ cơ sở dữ liệu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadUsers()}
            className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-muted">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary mb-2" />
                    Đang tải dữ liệu người dùng thực...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-muted">
                    Không tìm thấy thành viên nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive = u.status === "ACTIVE";
                  return (
                    <tr key={u.id} className="transition hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={u.fullName}
                            email={u.email}
                            size="sm"
                            className="h-9 w-9 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-heading truncate">{u.fullName}</p>
                            <p className="text-xs text-muted truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
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
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            Chờ kích hoạt
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted">
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
