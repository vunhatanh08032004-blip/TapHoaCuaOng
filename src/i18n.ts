export type Language = 'vi';

export const viTranslations = {
  // Menu & App Header
  brand: 'Tạp Hóa Của Ong',
  appName: 'Trình tải phim ngắn Hồng Quả',
  menuDownload: 'Tải phim Hồng Quả',
  menuManager: 'Quản lý tải xuống',
  menuSettings: 'Cài đặt',
  footerNote: 'Chào mừng đến Tạp Hóa Của Ong',

  // Hongguo Download Page
  heroTitle: 'Tải hàng loạt phim ngắn Hồng Quả',
  heroDesc:
    'Hỗ trợ dán liên kết chia sẻ từ App Hồng Quả hoặc nhập ID phim, tự động giải mã luồng video AES-128 CENC và xuất file MP4 không gắn watermark kèm ảnh bìa phim.',
  inputTitle: 'Nhập liên kết phim hoặc ID (series_id)',
  inputPlaceholder:
    'Ví dụ: https://novelquickapp.com/s/WGPClz6sw10/ hoặc 7664958856774044697',
  btnResolving: 'Đang phân tích...',
  btnResolve: 'Phân tích phim',
  episodesUnit: 'tập',
  totalEpisodes: 'Tổng số tập:',
  nativeDecryptBadge: 'Tự động giải mã AES-128',
  previewEp1: 'Xem thử tập 1',
  btnDownloadCover: 'Lưu ảnh bìa',
  coverLabel: 'Ảnh bìa',
  downloadSelected: 'Tải các mục đã chọn',
  viewManager: 'Xem quản lý tải',
  selectAll: 'Chọn tất cả',
  invertSelect: 'Đảo chọn',
  deselectAll: 'Bỏ chọn tất cả',
  episodeIndexPrefix: 'Tập',
  previewTooltip: 'Xem thử trực tiếp tập này',
  msgEnterLink: 'Vui lòng nhập liên kết chia sẻ hoặc series_id của phim',
  msgResolveSuccess: 'Phân tích thành công 《{title}》, tổng cộng {total} tập!',
  msgResolveFail: 'Phân tích thất bại, vui lòng kiểm tra lại liên kết hoặc kết nối mạng',
  msgSelectAtLeastOne: 'Vui lòng chọn ít nhất 1 mục (tập phim hoặc ảnh bìa) để tải về',
  msgQueueSuccess:
    'Đã đưa thành công {count} mục vào hàng đợi tải! Bấm "Xem quản lý tải" để xem tiến độ.',

  // Download Manager Page
  statAll: 'Tất cả tác vụ',
  statDownloading: 'Đang tải / Hàng đợi',
  statCompleted: 'Đã hoàn tất',
  statFailed: 'Lỗi / Đã dừng',
  selectAllCurrent: 'Chọn tất cả',
  deselectAllCurrent: 'Bỏ chọn',
  retrySelected: 'Thử lại mục chọn',
  deleteSelected: 'Xóa mục chọn',
  clearCompleted: 'Dọn sạch tác vụ đã xong',
  openSaveDirBtn: 'Thư mục lưu phim',
  goToDownload: 'Thêm phim mới',
  emptyTitle: 'Chưa có tác vụ tải nào',
  emptyDescAll:
    'Hãy chuyển sang trang "Tải phim Hồng Quả", dán link hoặc ID phim để bắt đầu tải hàng loạt',
  emptyDescFiltered: 'Không có tác vụ nào trong danh mục hiện tại',
  statusDownloading: 'Đang tải',
  statusPending: 'Đang chờ',
  statusCompleted: 'Đã xong',
  statusFailed: 'Thất bại',
  statusStopped: 'Đã dừng',
  btnStop: 'Dừng',
  btnRetry: 'Thử lại',
  btnPlay: 'Phát',
  btnDownloadFile: 'Lưu vào máy (.mp4)',
  btnDownloadImage: 'Lưu ảnh bìa (.jpg)',
  btnDownloadAllCompleted: 'Lưu tất cả file về máy',
  btnDelete: 'Xóa',
  downloadGuide: '💡 Sau khi hoàn tất (màu xanh lá), bấm nút "Lưu vào máy" trên từng mục hoặc "Lưu tất cả file về máy" để tải file MP4 và ảnh bìa trực tiếp vào máy tính của bạn!',

  // Settings Page
  settingsTitle: 'Cài đặt hệ thống',
  downloadDirLabel: 'Thư mục lưu trữ video & ảnh bìa',
  chooseFolder: 'Chọn thư mục',
  folderHint: 'Video và ảnh bìa tải về sẽ được lưu tại: Thư mục lưu trữ/Hồng Quả/Tên phim/',
  namingRuleLabel: 'Quy tắc đặt tên file tải về',
  presetSeriesEp: 'TênPhim_TậpN',
  presetSeriesEpTitle: 'TênPhim_TậpN_TiêuĐề',
  presetSeriesOnly: 'Chỉ tên phim',
  namingHint:
    'Biến khả dụng: TênPhim (hoặc series_title) · TậpN (hoặc vid_index) · TiêuĐề (hoặc ep_title). Ảnh bìa sẽ được đặt tên theo đúng cấu trúc tương ứng.',
  concurrencyLabel: 'Số lượt tải đồng thời tối đa',
  concurrentOption: 'tải cùng lúc',
  concurrencyHint: 'Càng nhiều luồng tải càng nhanh, đề xuất đặt 3 ~ 5 luồng',
  btnSaveSettings: 'Lưu cài đặt',
  btnSavedSuccess: 'Đã lưu thành công',

  // Video Player Modal
  modalDecryptStream: 'Giải mã luồng trực tiếp CENC-AES-CTR',
  modalDownloadMp4: 'Tải file MP4',
  modalClose: 'Đóng',
  modalBuffering: 'Đang thực hiện giải mã luồng AES-CTR và nạp dữ liệu đệm...',
  modalPlayFail:
    'Không thể giải mã hoặc tải luồng video, vui lòng kiểm tra mạng hoặc tải về từ trang Quản lý tải',
  modalWatermarkFree: 'Không watermark · Phát trực tiếp chất lượng gốc',
};

export const translations = {
  vi: viTranslations,
  zh: viTranslations, // 100% Vietnamese
};

export function getLang(): Language {
  return 'vi';
}

export function setLang(_lang: string) {
  // Always Vietnamese
}
