# Test Coverage — library-api

Ringkasan seluruh test yang ada di `library-api/tests` (126 test, hasil `uv run pytest --collect-only`).
Dokumen ini terpisah dari `README.md` dan sebaiknya diperbarui setiap kali test baru ditambahkan/dihapus.

Jalankan dengan:

```bash
uv run pytest                    # semua test
uv run pytest tests/unit         # unit saja
uv run pytest tests/integration  # integration saja
uv run pytest tests/e2e          # e2e saja
```

## Ringkasan per layer

| Layer | File | Jumlah test |
|---|---|---|
| E2E | `tests/e2e/test_borrowing_lifecycle.py` | 1 |
| Integration | `tests/integration/test_books.py` | 18 |
| Integration | `tests/integration/test_borrowings.py` | 15 |
| Integration | `tests/integration/test_health_and_envelope.py` | 7 |
| Integration | `tests/integration/test_members.py` | 17 |
| Unit | `tests/unit/test_base_response.py` | 4 |
| Unit | `tests/unit/test_book_service.py` | 10 |
| Unit | `tests/unit/test_borrowing_service.py` | 11 |
| Unit | `tests/unit/test_config.py` | 5 |
| Unit | `tests/unit/test_error_handlers.py` | 4 |
| Unit | `tests/unit/test_member_service.py` | 10 |
| Unit | `tests/unit/test_schemas.py` | 14 |
| **Total** | | **126** |

---

## E2E — `tests/e2e/test_borrowing_lifecycle.py`

| Test | Yang dicover |
|---|---|
| `test_full_borrow_and_return_lifecycle` | Alur penuh: buat book & member → borrow → cek `available_copies` berkurang → return → cek `available_copies` pulih dan status borrowing `returned`, semua lewat HTTP stack sungguhan (bukan mock). |

---

## Integration — `tests/integration/test_books.py`

| Group | Test | Yang dicover |
|---|---|---|
| Create | `test_create_returns_201_with_available_copies_seeded_from_total` | POST book baru → 201, `available_copies` di-seed sama dengan `total_copies`. |
| Create | `test_create_rejects_blank_title` | Validasi: title kosong ditolak (422). |
| Create | `test_create_rejects_negative_total_copies` | Validasi: `total_copies` negatif ditolak (422). |
| Create | `test_create_rejects_title_exceeding_max_length` | Validasi: title melebihi panjang maksimum ditolak (422). |
| Create | `test_create_rejects_duplicate_isbn` | Business rule: ISBN duplikat → 409 conflict. |
| Get | `test_get_existing_book` | GET by id mengembalikan data yang benar. |
| Get | `test_get_missing_book_returns_404` | GET id yang tidak ada → 404. |
| Update | `test_update_fields_partially` | PATCH sebagian field tidak mengubah field lain. |
| Update | `test_update_missing_book_returns_404` | Update book yang tidak ada → 404. |
| Update | `test_update_isbn_conflict_with_another_book` | Update ISBN ke ISBN book lain → 409. |
| Update | `test_update_isbn_to_its_own_current_value_is_allowed` | Update ISBN ke nilai miliknya sendiri tidak dianggap conflict. |
| Update | `test_increasing_total_copies_increases_available_by_the_same_delta` | Menaikkan `total_copies` menambah `available_copies` sejumlah delta yang sama. |
| Update | `test_reducing_total_copies_accounts_for_already_borrowed_copies` | Menurunkan `total_copies` tetap konsisten dengan jumlah yang sedang dipinjam. |
| Update | `test_reducing_total_copies_below_currently_borrowed_is_rejected` | Menurunkan `total_copies` di bawah jumlah yang sedang dipinjam → ditolak. |
| Delete | `test_delete_missing_book_returns_404` | Delete book yang tidak ada → 404. |
| Delete | `test_delete_book_with_no_borrowings_succeeds` | Delete book tanpa riwayat peminjaman → sukses. |
| Delete | `test_delete_book_with_active_borrowing_is_rejected` | Delete book yang sedang dipinjam aktif → ditolak (422). |
| Delete | `test_delete_book_with_returned_borrowing_history_is_rejected_as_conflict` | Delete book dengan riwayat peminjaman (sudah dikembalikan) → ditolak sebagai conflict (409), demi integritas histori. |
| List | `test_search_matches_title_author_or_isbn_case_insensitively` | Search cocok di title/author/isbn, case-insensitive. |
| List | `test_filter_by_category` | Filter by category bekerja. |
| List | `test_pagination_splits_results_by_limit` | Pagination membagi hasil sesuai `limit`, tidak ada id duplikat/hilang antar halaman. |
| List | `test_limit_out_of_range_returns_422` | `limit` di luar rentang valid (0, 101) → 422. |
| **Security** | `test_search_input_is_not_vulnerable_to_sql_injection` | Payload SQL injection (`'; DROP TABLE books; --`, `' OR '1'='1`, `%' UNION SELECT * FROM books --`) di parameter `search` tidak menyebabkan error/500, tidak mengembalikan data tak sah, dan tidak merusak tabel/data asli. |

---

## Integration — `tests/integration/test_borrowings.py`

| Group | Test | Yang dicover |
|---|---|---|
| Borrow | `test_borrow_decrements_available_copies_and_defaults_due_date` | Borrow mengurangi `available_copies` dan mengisi `due_at` default bila tidak diberikan. |
| Borrow | `test_borrow_respects_explicit_due_at` | `due_at` eksplisit dihormati. |
| Borrow | `test_borrow_rejected_when_no_copies_available` | Borrow ditolak saat `available_copies` = 0. |
| Borrow | `test_borrow_rejected_for_inactive_member` | Borrow ditolak untuk member berstatus non-aktif. |
| Borrow | `test_borrow_missing_book_returns_404` | Borrow dengan `book_id` tidak ada → 404. |
| Borrow | `test_borrow_missing_member_returns_404` | Borrow dengan `member_id` tidak ada → 404. |
| Borrow | `test_borrow_rejects_non_positive_book_or_member_id` | Validasi input: `book_id`/`member_id` ≤ 0 ditolak (422). |
| Get/List | `test_get_borrowing_includes_nested_book_and_member` | Response borrowing menyertakan nested object book & member. |
| Get/List | `test_get_missing_borrowing_returns_404` | GET borrowing yang tidak ada → 404. |
| Get/List | `test_list_filters_by_status` | Filter list borrowing by status. |
| Get/List | `test_list_filters_by_member_id_and_book_id` | Filter list borrowing by `member_id` dan `book_id`. |
| Return | `test_return_marks_status_and_restores_available_copies` | Return mengubah status jadi `returned` dan mengembalikan `available_copies`. |
| Return | `test_return_already_returned_borrowing_is_rejected` | Return dua kali pada borrowing yang sama → ditolak. |
| Return | `test_return_missing_borrowing_returns_404` | Return borrowing yang tidak ada → 404. |
| Return | `test_return_after_total_copies_was_reduced_stays_consistent_with_new_total` | Return tetap konsisten walau `total_copies` book sempat diturunkan setelah borrow. |

---

## Integration — `tests/integration/test_health_and_envelope.py`

| Test | Yang dicover |
|---|---|
| `test_health_endpoint` | Endpoint health check merespons sukses. |
| `test_root_returns_success_envelope` | Root endpoint mengembalikan `BaseResponse` envelope sukses. |
| `test_unknown_route_returns_error_envelope_with_matching_status` | Route yang tidak dikenal → error envelope, HTTP status = `info.code`. |
| `test_not_found_business_exception_matches_http_status` | `NotFoundException` dari service → envelope error dengan status HTTP yang sesuai (404). |
| `test_validation_error_returns_422_with_field_in_message` | `RequestValidationError` → 422, pesan menyebutkan field yang bermasalah. |
| `test_path_param_type_mismatch_returns_422_not_500` | Path param dengan tipe salah (mis. string di path integer) → 422, bukan 500. |
| **Security** | `test_business_exceptions_never_carry_a_stacktrace` | Business exception (4xx) tidak pernah membawa `stacktrace` di response — mencegah kebocoran informasi internal. |

---

## Integration — `tests/integration/test_members.py`

| Group | Test | Yang dicover |
|---|---|---|
| Create | `test_create_defaults_status_to_active` | Member baru default `status = active` bila tidak diisi. |
| Create | `test_create_accepts_explicit_status` | Status eksplisit saat create diterima. |
| Create | `test_create_rejects_duplicate_email` | Email duplikat → 409 conflict. |
| Create | `test_create_rejects_invalid_email` | Format email tidak valid → 422. |
| Get | `test_get_existing_member` | GET by id mengembalikan data benar. |
| Get | `test_get_missing_member_returns_404` | GET id tidak ada → 404. |
| Update | `test_update_partial_fields` | PATCH sebagian field tidak mengubah field lain. |
| Update | `test_update_missing_member_returns_404` | Update member tidak ada → 404. |
| Update | `test_update_email_conflict_with_another_member` | Update email ke email member lain → 409. |
| Update | `test_update_email_to_its_own_current_value_is_allowed` | Update email ke nilai sendiri bukan conflict. |
| Update | `test_update_status_changes_eligibility` | Mengubah status member memengaruhi eligibility (mis. untuk borrow). |
| Delete | `test_delete_missing_member_returns_404` | Delete member tidak ada → 404. |
| Delete | `test_delete_member_with_no_borrowings_succeeds` | Delete member tanpa riwayat peminjaman → sukses. |
| Delete | `test_delete_member_with_active_borrowing_is_rejected` | Delete member dengan peminjaman aktif → ditolak (422). |
| Delete | `test_delete_member_with_returned_borrowing_history_is_rejected_as_conflict` | Delete member dengan riwayat peminjaman (sudah dikembalikan) → ditolak sebagai conflict (409). |
| List | `test_search_matches_name_or_email` | Search cocok di name/email. |
| List | `test_filter_by_status` | Filter by status bekerja. |
| List | `test_pagination` | Pagination list member bekerja benar. |
| **Security** | `test_search_input_is_not_vulnerable_to_sql_injection` | Payload SQL injection (`'; DROP TABLE members; --`) di parameter `search` tidak menyebabkan error dan tidak merusak data. |

---

## Unit — `tests/unit/test_base_response.py`

| Test | Yang dicover |
|---|---|
| `test_success_envelope_defaults` | Envelope sukses default (`status`, `info.code`, `info.message`) terbentuk benar. |
| `test_success_envelope_accepts_custom_code_and_message` | Envelope sukses menerima override code/message. |
| `test_error_envelope_carries_status_and_optional_stacktrace` | Envelope error membawa status dan stacktrace opsional. |
| `test_error_envelope_stacktrace_defaults_to_none` | Stacktrace default `None` bila tidak diberikan. |

## Unit — `tests/unit/test_book_service.py`

| Group | Test | Yang dicover |
|---|---|---|
| Create | `test_raises_conflict_when_isbn_already_exists` | Service melempar `ConflictException` untuk ISBN duplikat (dengan repo di-mock). |
| Create | `test_seeds_available_copies_from_total_copies` | `available_copies` di-set dari `total_copies` saat create. |
| Update | `test_raises_not_found_when_book_missing` | `NotFoundException` saat update book yang tidak ada. |
| Update | `test_raises_conflict_when_new_isbn_belongs_to_another_book` | `ConflictException` saat ISBN baru dipakai book lain. |
| Update | `test_allows_isbn_update_to_its_own_current_value` | Update ISBN ke nilai sendiri diperbolehkan. |
| Update | `test_increasing_total_copies_increases_available_by_same_delta` | Logika delta saat `total_copies` naik. |
| Update | `test_reducing_total_copies_accounts_for_already_borrowed_copies` | Logika delta saat `total_copies` turun, memperhitungkan yang sedang dipinjam. |
| Update | `test_rejects_total_copies_below_currently_borrowed` | Menolak `total_copies` baru di bawah jumlah yang sedang dipinjam. |
| Delete | `test_raises_not_found_when_book_missing` | `NotFoundException` saat delete book tidak ada. |
| Delete | `test_raises_unprocessable_when_book_has_active_borrowing` | `UnprocessableEntityException` saat masih ada peminjaman aktif. |
| Delete | `test_raises_conflict_when_book_has_borrowing_history` | `ConflictException` saat ada riwayat peminjaman (sudah returned). |
| Delete | `test_deletes_when_no_borrowing_history` | Delete berhasil bila tidak ada riwayat peminjaman sama sekali. |

## Unit — `tests/unit/test_borrowing_service.py`

| Group | Test | Yang dicover |
|---|---|---|
| Borrow | `test_raises_not_found_when_book_missing` | `NotFoundException` bila book tidak ada. |
| Borrow | `test_raises_not_found_when_member_missing` | `NotFoundException` bila member tidak ada. |
| Borrow | `test_rejects_inactive_member` | Menolak borrow untuk member non-aktif. |
| Borrow | `test_rejects_when_no_copies_available` | Menolak borrow saat `available_copies` = 0. |
| Borrow | `test_decrements_available_copies_and_defaults_due_date` | Transaksi borrow: decrement copies + default due date, dalam satu transaksi. |
| Borrow | `test_respects_explicit_due_at` | `due_at` eksplisit dihormati di service layer. |
| Return | `test_raises_not_found_when_borrowing_missing` | `NotFoundException` bila borrowing tidak ada. |
| Return | `test_rejects_already_returned_borrowing` | Menolak return ganda. |
| Return | `test_raises_not_found_when_borrowings_book_is_missing` | Edge case: book terkait borrowing sudah tidak ada saat return. |
| Return | `test_restores_available_copies_and_marks_returned` | Return mengembalikan copies & menandai status `returned`. |
| Return | `test_caps_available_copies_at_total_copies` | `available_copies` hasil return tidak pernah melebihi `total_copies` (guard konsistensi data). |

## Unit — `tests/unit/test_config.py`

| Group | Test | Yang dicover |
|---|---|---|
| CORS | `test_splits_and_strips_comma_separated_origins` | `CORS_ORIGINS` dipecah & di-trim dari string koma. |
| CORS | `test_drops_empty_entries` | Entry kosong di `CORS_ORIGINS` dibuang. |
| CORS | `test_single_origin` | Satu origin tanpa koma tetap diparse benar. |
| Environment | `test_true_when_environment_is_production_case_insensitive` | `is_production` true untuk "production" (case-insensitive). |
| Environment | `test_false_for_development_and_other_values` | `is_production` false untuk value selain production. |

## Unit — `tests/unit/test_error_handlers.py`

| Group | Test | Yang dicover |
|---|---|---|
| **Security** | `test_hides_stacktrace_in_production` | Unhandled exception handler tidak mengembalikan stacktrace saat `environment=production` (hanya pesan generik "Internal Server Error"). |
| — | `test_includes_stacktrace_outside_production` | Stacktrace tetap muncul di luar production untuk kebutuhan debugging. |
| Validation | `test_message_includes_offending_field` | Pesan error validasi menyebutkan field yang bermasalah. |
| Validation | `test_falls_back_to_generic_message_when_no_errors` | Fallback ke pesan generik bila tidak ada detail error field. |

## Unit — `tests/unit/test_member_service.py`

| Group | Test | Yang dicover |
|---|---|---|
| Create | `test_raises_conflict_when_email_already_exists` | `ConflictException` untuk email duplikat. |
| Create | `test_creates_member_when_email_is_unique` | Create sukses saat email unik. |
| Update | `test_raises_not_found_when_member_missing` | `NotFoundException` saat update member tidak ada. |
| Update | `test_raises_conflict_when_new_email_belongs_to_another_member` | `ConflictException` saat email baru dipakai member lain. |
| Update | `test_allows_email_update_to_its_own_current_value` | Update email ke nilai sendiri diperbolehkan. |
| Update | `test_updates_status` | Update status member berhasil. |
| Delete | `test_raises_not_found_when_member_missing` | `NotFoundException` saat delete member tidak ada. |
| Delete | `test_raises_unprocessable_when_member_has_active_borrowing` | `UnprocessableEntityException` saat member punya peminjaman aktif. |
| Delete | `test_raises_conflict_when_member_has_borrowing_history` | `ConflictException` saat member punya riwayat peminjaman. |
| Delete | `test_deletes_when_no_borrowing_history` | Delete berhasil tanpa riwayat peminjaman. |

## Unit — `tests/unit/test_schemas.py`

| Group | Test | Yang dicover |
|---|---|---|
| BookCreate | `test_rejects_blank_field[title/author/isbn/category]` | Field wajib tidak boleh kosong (parametrized 4 field). |
| BookCreate | `test_strips_surrounding_whitespace` | Whitespace di sekeliling input string di-strip otomatis. |
| BookCreate | `test_rejects_negative_total_copies` | `total_copies` negatif ditolak di level schema. |
| BookCreate | `test_accepts_zero_total_copies` | `total_copies = 0` valid (batas bawah diterima). |
| MemberCreate | `test_defaults_status_to_active` | Default `status = active` di level schema. |
| MemberCreate | `test_accepts_explicit_status` | Status eksplisit diterima. |
| MemberCreate | `test_rejects_invalid_email` | Format email invalid ditolak di level schema. |
| BorrowingCreate | `test_rejects_non_positive_ids[...]` | `book_id`/`member_id` ≤ 0 ditolak (parametrized 4 kombinasi). |
| BorrowingCreate | `test_due_at_is_optional` | `due_at` boleh tidak diisi. |

---

## Celah yang belum tercover (security & lainnya)

- **Auth/Authorization** — API belum punya autentikasi sama sekali (memang out of scope pada fase ini, lihat `CLAUDE.md`), jadi tidak ada test terkait access control.
- **Rate limiting** — belum ada test/implementasi.
- **XSS/sanitization di frontend** — belum dicek pada `library-fe` (di luar cakupan dokumen ini).
- **Input ekstrem lain** — payload sangat panjang, unicode/format-string injection pada field selain `search` belum ditest secara eksplisit.
- **CORS behavior end-to-end** — hanya parsing `CORS_ORIGINS` yang ditest (`test_config.py`), belum ada test header CORS aktual pada response HTTP.
