import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  createBookmark,
  createQuote,
  deleteBookmark,
  deleteQuote,
  getBook,
  listBookmarks,
  listQuotes,
  updateReadingProgress,
} from '../lib/mockApi';
import { Book, Bookmark, Quote } from '../types/domain';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type FileType = 'epub' | 'pdf' | 'other';

const READER_LOCATION_STORAGE_PREFIX = 'home-library-reader-location:';

function detectFileType(fileName?: string): FileType {
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'epub') return 'epub';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPdfPageFromProgress(progress: number, totalPages: number) {
  if (totalPages <= 1) return 1;
  return clamp(Math.round((progress / 100) * (totalPages - 1)) + 1, 1, totalPages);
}

function getProgressFromPdfPage(page: number, totalPages: number) {
  if (totalPages <= 1) return 100;
  return Math.round(((page - 1) / (totalPages - 1)) * 100);
}

function parsePdfLocation(location: string) {
  if (!location.startsWith('page:')) return null;
  const page = Number(location.slice('page:'.length));
  return Number.isFinite(page) ? page : null;
}

function formatLocation(location: string) {
  const page = parsePdfLocation(location);
  return page ? `Стр. ${page}` : location;
}

function extractTextSnippet(items: any[]) {
  return items
    .map(item => (typeof item?.str === 'string' ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

async function renderPdfTextLayer(page: any, viewport: any, container: HTMLDivElement) {
  const textContent = await page.getTextContent();
  const items = Array.isArray(textContent.items) ? textContent.items : [];
  container.replaceChildren();
  container.style.width = `${Math.floor(viewport.width)}px`;
  container.style.height = `${Math.floor(viewport.height)}px`;

  for (const item of items) {
    if (!item?.str) continue;

    const textSpan = document.createElement('span');
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const angle = Math.atan2(tx[1], tx[0]);
    const fontHeight = Math.hypot(tx[2], tx[3]);
    const left = tx[4];
    const top = tx[5] - fontHeight;

    textSpan.textContent = item.str;
    textSpan.className = 'pdf-text-layer__text';
    textSpan.style.left = `${left}px`;
    textSpan.style.top = `${top}px`;
    textSpan.style.fontSize = `${fontHeight}px`;
    textSpan.style.transform = `rotate(${angle}rad)`;

    container.appendChild(textSpan);
  }

  return {
    hasSelectableText: items.some((item: any) => typeof item?.str === 'string' && item.str.trim().length > 0),
  };
}

function readStoredLocation(bookId: string) {
  return window.localStorage.getItem(`${READER_LOCATION_STORAGE_PREFIX}${bookId}`);
}

function writeStoredLocation(bookId: string, location: string) {
  window.localStorage.setItem(`${READER_LOCATION_STORAGE_PREFIX}${bookId}`, location);
}

export function ReaderViewPage() {
  const { libraryId = '', bookId = '' } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentCfi, setCurrentCfi] = useState('');
  const [currentPageNum, setCurrentPageNum] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [selectedCfi, setSelectedCfi] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'bookmarks' | 'quotes'>('bookmarks');
  const [saving, setSaving] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [bookmarkFeedbackActive, setBookmarkFeedbackActive] = useState(false);

  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const [pdfIsLoading, setPdfIsLoading] = useState(false);
  const [pdfHasSelectableText, setPdfHasSelectableText] = useState(false);

  const renditionRef = useRef<any>(null);
  const epubViewerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfTextLayerRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  const pdfDocumentRef = useRef<any>(null);
  const pdfRenderTaskRef = useRef<any>(null);
  const pdfRenderRequestRef = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProgressRef = useRef<number | null>(null);
  const skipNextPdfProgressSyncRef = useRef(false);
  const bookmarkFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileType = detectFileType(book?.fileName);

  function queueProgressSave(progress: number, delayMs: number) {
    latestProgressRef.current = progress;
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }

    progressTimerRef.current = setTimeout(() => {
      const pending = latestProgressRef.current;
      if (pending === null) return;
      latestProgressRef.current = null;
      updateReadingProgress(bookId, pending)
        .then(updatedBook => setBook(updatedBook))
        .catch(() => { /* silent */ });
    }, delayMs);
  }

  function flushPendingProgress() {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    const pending = latestProgressRef.current;
    if (pending === null) return;
    latestProgressRef.current = null;
    void updateReadingProgress(bookId, pending)
      .then(updatedBook => setBook(updatedBook))
      .catch(() => { /* silent */ });
  }

  function goToPdfPage(targetPage: number) {
    if (pdfPageCount === 0) return;
    setPdfCurrentPage(previousPage => {
      const nextPage = clamp(targetPage, 1, pdfPageCount);
      return nextPage === previousPage ? previousPage : nextPage;
    });
  }

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const [loadedBook, loadedBookmarks, loadedQuotes] = await Promise.all([
          getBook(bookId),
          listBookmarks(bookId),
          listQuotes(bookId),
        ]);
        setBook(loadedBook);
        setReadingProgress(loadedBook?.progress ?? 0);
        setBookmarks(loadedBookmarks);
        setQuotes(loadedQuotes);
        setError('');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Ошибка загрузки книги.');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [bookId]);

  useEffect(() => {
    return () => {
      flushPendingProgress();
      if (bookmarkFeedbackTimerRef.current) {
        clearTimeout(bookmarkFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (fileType !== 'epub' || !book?.fileUrl || !epubViewerRef.current) return;

    let destroyed = false;

    import('epubjs').then(({ default: ePub }) => {
      if (destroyed || !epubViewerRef.current) return;

      const epubBook = (ePub as any)(book.fileUrl);
      const rendition = epubBook.renderTo(epubViewerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none',
      });

      renditionRef.current = rendition;

      const openAtSavedPosition = async () => {
        const storedLocation = readStoredLocation(bookId);
        if (storedLocation && !storedLocation.startsWith('page:')) {
          try {
            await rendition.display(storedLocation);
            return;
          } catch {
            /* fall through to percentage-based restore */
          }
        }

        if ((book.progress ?? 0) > 0) {
          try {
            await epubBook.ready;
            await epubBook.locations.generate(1000);
            const cfi = epubBook.locations.cfiFromPercentage(Math.min((book.progress ?? 0) / 100, 0.999));
            if (cfi) {
              await rendition.display(cfi);
              return;
            }
          } catch {
            /* fall back to start */
          }
        }

        await rendition.display();
      };

      void openAtSavedPosition();

      rendition.on('relocated', (location: any) => {
        const cfi = location?.start?.cfi ?? '';
        const pageNum = location?.start?.displayed?.page ?? 0;
        const pct = Math.round((location?.start?.percentage ?? 0) * 100);
        setCurrentCfi(cfi);
        setCurrentPageNum(pageNum);
        setReadingProgress(pct);
        if (cfi) {
          writeStoredLocation(bookId, cfi);
        }

        try {
          const iframe = epubViewerRef.current?.querySelector('iframe') as HTMLIFrameElement | null;
        } catch {
          /* sandboxed iframe */
        }

        queueProgressSave(pct, 2000);
      });

      rendition.on('selected', (cfiRange: string, contents: any) => {
        const text = (contents?.window?.getSelection?.()?.toString() ?? '').trim();
        if (!text) return;
        setSelectedText(text);
        setSelectedCfi(cfiRange);
      });
    }).catch(() => {
      setError('Не удалось открыть EPUB файл.');
    });

    return () => {
      destroyed = true;
      try {
        renditionRef.current?.destroy();
      } catch {
        /* ignore */
      }
      renditionRef.current = null;
      flushPendingProgress();
    };
  }, [bookId, book?.fileUrl, fileType]);

  useEffect(() => {
    if (fileType !== 'pdf' || !book?.fileUrl) return;

    let cancelled = false;
    setPdfIsLoading(true);
    setPdfPageCount(0);
    setCurrentCfi('');
    setSelectedText('');
    setSelectedCfi('');

    const loadingTask = pdfjsLib.getDocument(book.fileUrl);

    loadingTask.promise
      .then(pdfDocument => {
        if (cancelled) {
          void pdfDocument.destroy();
          return;
        }

        pdfDocumentRef.current = pdfDocument;
        setPdfPageCount(pdfDocument.numPages);
        const storedLocation = readStoredLocation(bookId);
        const storedPage = storedLocation ? parsePdfLocation(storedLocation) : null;
        const initialPage = storedPage
          ? clamp(storedPage, 1, pdfDocument.numPages)
          : getPdfPageFromProgress(book.progress ?? 0, pdfDocument.numPages);
        skipNextPdfProgressSyncRef.current = true;
        setPdfCurrentPage(initialPage);
        setCurrentPageNum(initialPage);
      })
      .catch(() => {
        setError('Не удалось открыть PDF файл.');
      })
      .finally(() => {
        if (!cancelled) {
          setPdfIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      try {
        loadingTask.destroy();
      } catch {
        /* ignore */
      }
      try {
        pdfRenderTaskRef.current?.cancel();
      } catch {
        /* ignore */
      }
      try {
        void pdfDocumentRef.current?.destroy();
      } catch {
        /* ignore */
      }
      pdfRenderTaskRef.current = null;
      pdfDocumentRef.current = null;
      flushPendingProgress();
    };
  }, [bookId, book?.fileUrl, fileType]);

  useEffect(() => {
    if (fileType !== 'pdf' || !pdfViewerRef.current) return;

    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      setPdfViewportWidth(nextWidth);
    });

    observer.observe(pdfViewerRef.current);
    setPdfViewportWidth(pdfViewerRef.current.clientWidth);

    return () => observer.disconnect();
  }, [fileType]);

  useEffect(() => {
    if (fileType !== 'pdf' || !pdfDocumentRef.current || !pdfCanvasRef.current || !pdfViewportWidth) return;

    let cancelled = false;
    const renderRequestId = ++pdfRenderRequestRef.current;

    const renderPage = async () => {
      const previousRenderTask = pdfRenderTaskRef.current;
      try {
        previousRenderTask?.cancel();
      } catch {
        /* ignore */
      }

      try {
        await previousRenderTask?.promise;
      } catch {
        /* previous render was cancelled */
      }

      const page = await pdfDocumentRef.current.getPage(pdfCurrentPage);
      if (cancelled || !pdfCanvasRef.current) return;

      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const maxWidth = Math.max(pdfViewportWidth - 48, 240);
      const scale = Math.min(Math.max(maxWidth / baseViewport.width, 0.75), 2.25);
      const viewport = page.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      context.clearRect(0, 0, viewport.width, viewport.height);

      const renderTask = page.render({
        canvasContext: context,
        viewport,
      });

      pdfRenderTaskRef.current = renderTask;
      await renderTask.promise;

      if (pdfTextLayerRef.current) {
        const { hasSelectableText } = await renderPdfTextLayer(page, viewport, pdfTextLayerRef.current);
        if (!cancelled && renderRequestId === pdfRenderRequestRef.current) {
          setPdfHasSelectableText(hasSelectableText);
        }
      }

      if (cancelled || renderRequestId !== pdfRenderRequestRef.current || !pdfViewerRef.current) return;
      pdfViewerRef.current.scrollTop = 0;
    };

    void renderPage().catch(renderError => {
      if (renderError && typeof renderError === 'object' && 'name' in renderError && renderError.name === 'RenderingCancelledException') {
        return;
      }
      setError('Не удалось отрисовать страницу PDF.');
    }).finally(() => {
    });

    return () => {
      cancelled = true;
      try {
        pdfRenderTaskRef.current?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [fileType, pdfCurrentPage, pdfViewportWidth]);

  useEffect(() => {
    if (fileType !== 'pdf' || pdfPageCount === 0) return;

    setCurrentPageNum(pdfCurrentPage);

    if (skipNextPdfProgressSyncRef.current) {
      skipNextPdfProgressSyncRef.current = false;
      return;
    }

    const progress = getProgressFromPdfPage(pdfCurrentPage, pdfPageCount);
    writeStoredLocation(bookId, `page:${pdfCurrentPage}`);
    setReadingProgress(progress);
    queueProgressSave(progress, 900);
  }, [fileType, pdfCurrentPage, pdfPageCount]);

  useEffect(() => {
    if (fileType !== 'pdf') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        goToPdfPage(pdfCurrentPage + 1);
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goToPdfPage(pdfCurrentPage - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileType, pdfCurrentPage, pdfPageCount]);

  async function handleAddBookmark() {
    const autoLabel = currentPageNum
      ? `Стр. ${currentPageNum}`
      : `Закладка ${bookmarks.length + 1}`;
    const label = bookmarkLabel.trim() || autoLabel;
    const location = fileType === 'pdf'
      ? `page:${pdfCurrentPage}`
      : currentCfi || 'начало';

    setSaving(true);
    try {
      await createBookmark(bookId, label, location);
      setBookmarks(await listBookmarks(bookId));
      setBookmarkLabel('');
      setBookmarkFeedbackActive(true);
      if (bookmarkFeedbackTimerRef.current) {
        clearTimeout(bookmarkFeedbackTimerRef.current);
      }
      bookmarkFeedbackTimerRef.current = setTimeout(() => setBookmarkFeedbackActive(false), 650);
      setPanelTab('bookmarks');
      setPanelOpen(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBookmark(bookmarkId: string) {
    setSaving(true);
    try {
      await deleteBookmark(bookId, bookmarkId);
      setBookmarks(current => current.filter(bookmark => bookmark.id !== bookmarkId));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveQuote() {
    if (!selectedText) return;
    setSaving(true);
    try {
      await createQuote(bookId, selectedText, undefined, selectedCfi || undefined);
      setQuotes(await listQuotes(bookId));
      setSelectedText('');
      setSelectedCfi('');
      window.getSelection()?.removeAllRanges();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuote(quoteId: string) {
    setSaving(true);
    try {
      await deleteQuote(bookId, quoteId);
      setQuotes(current => current.filter(quote => quote.id !== quoteId));
    } finally {
      setSaving(false);
    }
  }

  function handlePdfTextSelection() {
    window.setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';
      if (!text) return;

      setSelectedText(text);
      setSelectedCfi(`page:${pdfCurrentPage}`);
    }, 0);
  }

  function navigateTo(location: string) {
    if (fileType === 'pdf') {
      const page = parsePdfLocation(location);
      if (page) {
        goToPdfPage(page);
      }
      return;
    }

    if (renditionRef.current && location) {
      renditionRef.current.display(location);
    }
  }

  if (isLoading) {
    return <section className="content-card"><h2>Загрузка книги...</h2></section>;
  }

  if (!book) {
    return (
      <section className="content-card">
        <h2>Книга не найдена</h2>
        {error && <p className="muted-text">{error}</p>}
      </section>
    );
  }

  return (
    <div className="rv-shell">
      <div className="rv-toolbar">
        <Link className="reader-back-button" to={`/reader/${libraryId}/${bookId}`}>
          ← Назад
        </Link>

        <span className="rv-toolbar__title">{book.title}</span>

        <div className="rv-toolbar__actions">
          <input
            className="rv-bm-input"
            type="text"
            placeholder={currentPageNum
              ? `Стр. ${currentPageNum}`
              : 'Название закладки…'}
            value={bookmarkLabel}
            onChange={event => setBookmarkLabel(event.target.value)}
          />
          <button
            className={`rv-tool-btn rv-tool-btn--bookmark ${bookmarkFeedbackActive ? 'rv-tool-btn--bookmark-success' : ''}`}
            onClick={handleAddBookmark}
            disabled={saving}
            title="Добавить закладку на текущую позицию"
          >
            🔖 Добавить закладку
          </button>

          {selectedText && (
            <button
              className="rv-tool-btn rv-tool-btn--quote"
              onClick={() => void handleSaveQuote()}
              title="Сохранить выделенный текст как цитату"
              disabled={saving}
            >
              💬 Цитировать
            </button>
          )}

          <button
            className={`rv-tool-btn ${panelOpen ? 'rv-tool-btn--active' : ''}`}
            onClick={() => setPanelOpen(open => !open)}
            title="Открыть/закрыть панель закладок и цитат"
          >
            ☰ Заметки
          </button>

          <div className="rv-progress-pill" title={`Прогресс чтения: ${readingProgress}%`}>
            <strong>{readingProgress}%</strong>
            {fileType === 'pdf' && pdfPageCount > 0 && (
              <span>Стр. {pdfCurrentPage}/{pdfPageCount}</span>
            )}
            {fileType === 'epub' && currentPageNum > 0 && (
              <span>Стр. {currentPageNum}</span>
            )}
          </div>
        </div>
      </div>

      <div className="rv-body">
        <div className="rv-viewer-wrap">
          {!book.fileUrl ? (
            <div className="reader-empty-state">
              <h3>Файл книги недоступен</h3>
              <p>Для этой книги пока нет загруженного файла.</p>
              <Link className="primary-button" to={`/libraries/${libraryId}`}>
                Вернуться в библиотеку
              </Link>
            </div>
          ) : fileType === 'epub' ? (
            <>
              <div className="epub-viewer" ref={epubViewerRef} />
              <div className="epub-page-nav">
                <button className="epub-nav-btn" onClick={() => renditionRef.current?.prev()}>
                  ‹ Пред.
                </button>
                <div className="pdf-page-status">
                  {currentPageNum > 0 ? `Стр. ${currentPageNum}` : 'Открыто с сохраненной позиции'}
                </div>
                <button className="epub-nav-btn" onClick={() => renditionRef.current?.next()}>
                  След. ›
                </button>
              </div>
            </>
          ) : fileType === 'pdf' ? (
            <div className="pdf-reader-shell">
              <div className="pdf-reader-toolbar">
                <button
                  className="epub-nav-btn"
                  onClick={() => goToPdfPage(pdfCurrentPage - 1)}
                  disabled={pdfCurrentPage <= 1}
                >
                  ‹ Пред.
                </button>
                <div className="pdf-page-status">
                  {pdfPageCount > 0 ? `Стр. ${pdfCurrentPage} из ${pdfPageCount}` : 'Загрузка PDF...'}
                </div>
                <button
                  className="epub-nav-btn"
                  onClick={() => goToPdfPage(pdfCurrentPage + 1)}
                  disabled={pdfCurrentPage >= pdfPageCount}
                >
                  След. ›
                </button>
              </div>

              <div className="pdf-canvas-stage" ref={pdfViewerRef}>
                <div className="pdf-page-frame">
                  <canvas ref={pdfCanvasRef} className="pdf-page-canvas" />
                  <div
                    ref={pdfTextLayerRef}
                    className="pdf-text-layer"
                    onMouseUp={handlePdfTextSelection}
                  />
                </div>
                {pdfIsLoading && (
                  <div className="pdf-canvas-stage__overlay">
                    <p className="pdf-reader-message">Подготавливаем PDF...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="reader-empty-state">
              <h3>Формат файла пока не поддерживается</h3>
              <p>Загрузите PDF или EPUB, чтобы открыть книгу во встроенном просмотрщике.</p>
            </div>
          )}
        </div>

        {panelOpen && (
          <aside className="rv-panel">
            <div className="rv-panel__tabs">
              <button
                className={`rv-panel__tab ${panelTab === 'bookmarks' ? 'rv-panel__tab--active' : ''}`}
                onClick={() => setPanelTab('bookmarks')}
              >
                🔖 Закладки ({bookmarks.length})
              </button>
              <button
                className={`rv-panel__tab ${panelTab === 'quotes' ? 'rv-panel__tab--active' : ''}`}
                onClick={() => setPanelTab('quotes')}
              >
                💬 Цитаты ({quotes.length})
              </button>
            </div>

            <div className="rv-panel__body">
              {panelTab === 'bookmarks' ? (
                <>
                  {bookmarks.length === 0 ? (
                    <p className="muted-text">
                      Пока нет закладок. Нажмите «🔖 Добавить закладку» на панели сверху.
                    </p>
                  ) : (
                    bookmarks.map(bookmark => (
                      <div
                        key={bookmark.id}
                        className="rv-panel__item"
                      >
                        <button
                          className="rv-panel__item-main rv-panel__item--clickable"
                          onClick={() => navigateTo(bookmark.location)}
                          title="Перейти к закладке"
                        >
                          <strong>{bookmark.label}</strong>
                          {!bookmark.location.startsWith('epubcfi(') && (
                            <span className="rv-panel__item-sub">{formatLocation(bookmark.location)}</span>
                          )}
                        </button>
                        <button
                          className="rv-panel__icon-action"
                          onClick={() => void handleDeleteBookmark(bookmark.id)}
                          disabled={saving}
                          title="Удалить закладку"
                        >
                          Удалить
                        </button>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  {quotes.length === 0 ? (
                    <p className="muted-text">
                      {fileType === 'epub'
                        ? 'Выделите текст в книге и нажмите «💬 Цитировать», чтобы сохранить цитату.'
                        : pdfHasSelectableText
                          ? 'Выделите текст прямо на странице PDF и нажмите «💬 Цитировать», чтобы сохранить цитату.'
                          : 'На этой странице PDF нет встроенного текстового слоя, поэтому цитату из выделения создать нельзя.'}
                    </p>
                  ) : (
                    quotes.map(quote => (
                      <div
                        key={quote.id}
                        className="rv-panel__item"
                      >
                        <button
                          className={`rv-panel__item-main ${quote.location ? 'rv-panel__item--clickable' : ''}`}
                          onClick={() => quote.location && navigateTo(quote.location)}
                          disabled={!quote.location}
                          title={quote.location ? 'Перейти к цитате' : undefined}
                        >
                          <p className="rv-panel__item-quote">
                            «{quote.text.length > 160 ? `${quote.text.slice(0, 160)}…` : quote.text}»
                          </p>
                          {quote.note && <span className="rv-panel__item-sub">{quote.note}</span>}
                        </button>
                        <button
                          className="rv-panel__icon-action"
                          onClick={() => void handleDeleteQuote(quote.id)}
                          disabled={saving}
                          title="Удалить цитату"
                        >
                          Удалить
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
