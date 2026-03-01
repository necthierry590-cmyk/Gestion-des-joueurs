## Packages
date-fns | Formatting dates for display
lucide-react | Icons for the interface

## Notes
- Upload endpoint `/api/upload` expects `multipart/form-data` with a `file` field and returns `{ url: string }`.
- Backend automatically calculates `contractEndDate` based on `contractStartDate` and `contractDurationMonths`. Form only sends the duration.
- Auth is session/cookie based. `credentials: "include"` must be used on all requests (handled in queryClient usually, but explicitly added in hooks to be safe).
- Unsplash images used for auth page background.
