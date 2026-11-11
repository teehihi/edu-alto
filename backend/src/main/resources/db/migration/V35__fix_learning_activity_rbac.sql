-- V35: Restrict SYNC_LEARNING_ACTIVITIES permission to ADMIN role only (EDU-97)
DELETE FROM roles_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name <> 'ADMIN'
  AND p.name = 'SYNC_LEARNING_ACTIVITIES';
