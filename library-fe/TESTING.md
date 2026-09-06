# Test Coverage — library-fe

Ringkasan test yang sudah tercover di frontend (`library-fe`), dikelompokkan per file test.
Dijalankan dengan:

- Unit & integration (Vitest + React Testing Library, mock API via MSW): `bun run test`
- End-to-end (Playwright, build asli + backend `library-api` sungguhan): `bun run test:e2e`

## Unit & Integration Tests

### `src/api/client.test.ts` — `request()`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | resolves with `data` on a success envelope | Envelope sukses `{status, info, data}` di-unwrap jadi `data` saja |
| 2 | sends query params, dropping undefined/null/empty-string values | Query param `undefined`/`null`/`""` tidak ikut dikirim, nilai valid tetap terkirim |
| 3 | sends a JSON body and Content-Type header for mutating requests | Request `POST` mengirim body JSON + header `Content-Type: application/json` |
| 4 | throws ApiError with the envelope's message/code on a business error | Envelope error → `ApiError` dengan `message`/`code` sesuai `info` |
| 5 | never surfaces stacktrace even when the backend includes one | `stacktrace` dari backend tidak pernah bocor ke `error.message` |
| 6 | throws a connectivity ApiError when the network request fails outright | Kegagalan jaringan → `ApiError` pesan "Unable to reach the server...", `code: 0` |
| 7 | throws a generic ApiError when the response body isn't valid JSON | Body non-JSON (mis. HTML 502) → `ApiError` generik dengan `code` dari status HTTP |

### `src/components/BookFormModal.test.tsx`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | pre-fills fields from the given book and submits an update with trimmed values | Mode edit ter-*prefill*, submit memanggil `updateBook` dengan nilai ter-*trim* |
| 2 | rejects a non-integer total_copies without calling the API | Validasi client-side: `total_copies` desimal ditolak, API tidak dipanggil |
| 3 | rejects a negative total_copies without calling the API | Validasi client-side: `total_copies` negatif ditolak, API tidak dipanggil |
| 4 | submits a trimmed create payload and treats a blank description as null | Mode create: payload di-*trim*, `description` kosong dikirim sebagai `null` |
| 5 | shows the API's error message and keeps the modal open on failure | Error dari API (409) ditampilkan, modal tetap terbuka, `onSaved` tidak dipanggil |
| 6 | calls onClose when Cancel is clicked | Tombol Cancel memanggil `onClose` |

### `src/components/MemberFormModal.test.tsx`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | defaults a new member's status to active | Member baru default `status = active` |
| 2 | pre-fills fields for an existing member and submits a trimmed update | Mode edit ter-*prefill*, submit memanggil `updateMember` dengan nilai ter-*trim* |
| 3 | treats a blank optional phone as null on submit | Field `phone` kosong dikirim sebagai `null` saat create |
| 4 | shows the API's error message on a duplicate email and does not call onSaved | Error duplikat email (409) ditampilkan, `onSaved` tidak dipanggil |

### `src/components/DataState.test.tsx`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | shows the loading panel and nothing else while loading | State `loading` menampilkan "Loading…" saja |
| 2 | prioritizes the error panel over empty/content state, with a working Retry button | State error diprioritaskan di atas empty/content; tombol Retry memanggil `onRetry` |
| 3 | omits the Retry button when onRetry is not provided | Tombol Retry tidak dirender bila `onRetry` tidak diberikan |
| 4 | shows the empty message when there is no error and no data | State kosong menampilkan `emptyMessage` |
| 5 | renders children once loaded, non-empty and error-free | State sukses merender `children` |

### `src/components/StatusBadge.test.tsx`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | maps status %s to tone class %s (parametrized: active, borrowed, returned, overdue, inactive, suspended) | Setiap status dipetakan ke kelas warna badge yang benar |
| 2 | falls back to a neutral tone for an unrecognized status | Status tidak dikenal jatuh ke `badge-neutral` |

### `src/components/Pagination.test.tsx`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | renders nothing when there is only one page | `total_pages === 1` → komponen tidak merender apa pun |
| 2 | disables Previous on the first page and Next on the last page | Tombol Previous nonaktif di halaman pertama |
| 3 | enables both buttons on a middle page and disables Next on the last page | Kedua tombol aktif di halaman tengah, Next nonaktif di halaman terakhir |
| 4 | calls onPageChange with page ± 1 when Previous/Next are clicked | Klik Next/Previous memanggil `onPageChange` dengan halaman yang benar |
| 5 | shows the current page, total pages and total count | Teks ringkasan "Page X of Y (Z total)" ditampilkan dengan benar |

### `src/pages/BooksPage.test.tsx`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | shows a loading state, then the fetched books | Alur loading → data buku tampil |
| 2 | shows the empty state when there are no books | List kosong → pesan "No books found." |
| 3 | shows the backend's error message (never a stacktrace) and recovers via Retry | Error 500 tampil tanpa stacktrace; Retry memuat ulang data sukses |
| 4 | renders a book title containing markup as inert text, never as HTML | XSS: judul buku dengan HTML dirender sebagai teks polos, bukan HTML aktif |
| 5 | debounces search input and sends it as a query param, resetting to page 1 | Search input di-*debounce*, terkirim sebagai query param, reset ke halaman 1 |
| 6 | sends the category filter and resets to page 1 | Filter kategori terkirim sebagai query param |
| 7 | requests the next page when Next is clicked | Klik Next meminta halaman berikutnya ke API |
| 8 | deletes a book after confirmation and refreshes the list | Alur hapus buku via dialog konfirmasi, list ter-*refresh* |
| 9 | shows a delete-guard error inside the dialog and keeps it open | Error guard hapus (409, ada riwayat peminjaman) tampil di dialog, dialog tetap terbuka |
| 10 | creates a book through the Add Book modal and refreshes the list | Alur create buku via modal, list ter-*refresh* |

### `src/pages/MembersPage.test.tsx`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | shows the fetched members with their status badge | Data member tampil dengan badge status yang sesuai |
| 2 | shows — for a member with no phone number | `phone: null` ditampilkan sebagai "—" |
| 3 | filters by status and resets to page 1 | Filter status terkirim sebagai query param, reset ke halaman 1 |
| 4 | debounces the search box and sends it as a query param | Search input di-*debounce* sebelum request dikirim |
| 5 | never renders a stacktrace even when the backend error includes one | Stacktrace dari backend tidak pernah dirender ke DOM |
| 6 | edits a member and refreshes the row | Alur edit member, baris ter-*refresh* |
| 7 | shows a delete-guard conflict from the API and keeps the dialog open | Error guard hapus (409) tampil di dialog, dialog tetap terbuka |

### `src/pages/BorrowingsPage.test.tsx`

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | lists borrowings with formatted dates, status badge, and Return only while borrowed | Tanggal terformat, badge status, tombol Return hanya muncul saat status `borrowed` |
| 2 | hides the Return button for an already-returned borrowing | Tombol Return disembunyikan untuk peminjaman yang sudah `returned` |
| 3 | filters by status | Filter status terkirim sebagai query param |
| 4 | returns a book and refreshes the row to returned | Alur pengembalian buku, baris ter-*refresh* jadi status `returned` |
| 5 | shows a return error banner and leaves the borrowing untouched | Error saat return (409) tampil, state baris tidak berubah |
| 6 | only offers books with copies available and disables submit when none qualify (Borrow modal) | Dropdown hanya menampilkan buku tersedia; tombol Borrow nonaktif bila tidak ada opsi |
| 7 | submits a borrow with the selected book/member and a null due date by default (Borrow modal) | Submit tanpa due date mengirim `due_at: null` |
| 8 | sends an explicit due date as an ISO string (Borrow modal) | Due date yang diisi dikonversi & dikirim sebagai string ISO |
| 9 | shows the API's error when borrowing fails and keeps the modal open (Borrow modal) | Error peminjaman (422) tampil, modal tetap terbuka |
| 10 | shows the options-loading error when books/members fail to load (Borrow modal) | Kegagalan memuat opsi buku/member ditampilkan sebagai error |

## End-to-End Tests (Playwright, `e2e/`)

Berjalan terhadap build production asli + backend `library-api` sungguhan (SQLite disposable).

### `e2e/books.spec.ts` — Books

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | redirects "/" to /books and lists the seeded catalog | Redirect root ke `/books`, data seed tampil |
| 2 | searches by title and narrows the list | Pencarian judul menyaring daftar buku |
| 3 | filters by category | Filter kategori menyaring daftar, kategori tak cocok → empty state |
| 4 | creates a book through the modal | Alur create buku end-to-end lewat modal |
| 5 | shows a conflict error for a duplicate ISBN and keeps the modal open | ISBN duplikat → error konflik, modal tetap terbuka |
| 6 | edits a book and the row reflects the change | Alur edit buku, perubahan tercermin di baris tabel |
| 7 | deletes a book after confirmation | Alur hapus buku via dialog konfirmasi |
| 8 | blocks deleting a book with an active borrowing | Guard hapus: buku dengan peminjaman aktif tidak bisa dihapus |
| 9 | renders a book title containing markup as inert text, never as HTML | XSS: judul dengan HTML dirender sebagai teks polos |

### `e2e/members.spec.ts` — Members

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | shows created members and an empty state for a non-matching search | Pencarian member cocok/tidak cocok |
| 2 | filters by status | Filter status menyaring daftar member |
| 3 | creates a member through the modal | Alur create member end-to-end lewat modal |
| 4 | shows a conflict error for a duplicate email and keeps the modal open | Email duplikat → error konflik, modal tetap terbuka |
| 5 | edits a member and the row reflects the change | Alur edit member, perubahan tercermin di baris tabel |
| 6 | deletes a member after confirmation | Alur hapus member via dialog konfirmasi |
| 7 | blocks deleting a member with an active borrowing | Guard hapus: member dengan peminjaman aktif tidak bisa dihapus |

### `e2e/borrowings.spec.ts` — Borrowings

| # | Test case | Yang divalidasi |
|---|---|---|
| 1 | lists a freshly created borrowing with a Return action | Peminjaman baru tampil di list dengan tombol Return |
| 2 | filters by status | Filter status (`borrowed`/`returned`) menyaring daftar peminjaman |
| 3 | returns a book from the list and the row updates | Alur pengembalian buku, baris ter-*update* jadi `returned` |
| 4 | Borrow a Book modal excludes an out-of-stock book and a non-active member | Modal hanya menawarkan buku stok tersedia & member aktif |
| 5 | borrows a book with an explicit due date and it appears in the list | Alur peminjaman dengan due date eksplisit, muncul di list |

## Ringkasan jumlah test

| Level | File | Jumlah test case |
|---|---|---|
| Unit/Integration | `src/api/client.test.ts` | 7 |
| Unit/Integration | `src/components/BookFormModal.test.tsx` | 6 |
| Unit/Integration | `src/components/MemberFormModal.test.tsx` | 4 |
| Unit/Integration | `src/components/DataState.test.tsx` | 5 |
| Unit/Integration | `src/components/StatusBadge.test.tsx` | 2 (1 parametrized ×6 kasus) |
| Unit/Integration | `src/components/Pagination.test.tsx` | 5 |
| Unit/Integration | `src/pages/BooksPage.test.tsx` | 10 |
| Unit/Integration | `src/pages/MembersPage.test.tsx` | 7 |
| Unit/Integration | `src/pages/BorrowingsPage.test.tsx` | 10 |
| E2E | `e2e/books.spec.ts` | 9 |
| E2E | `e2e/members.spec.ts` | 7 |
| E2E | `e2e/borrowings.spec.ts` | 5 |

Catatan: hitungan `StatusBadge.test.tsx` menghitung `it.each` sebagai 1 test case dengan 6 kasus data
(active/borrowed/returned/overdue/inactive/suspended), ditambah 1 test kasus fallback.
