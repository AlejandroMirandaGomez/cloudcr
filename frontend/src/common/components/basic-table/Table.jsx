import { useMemo, useState } from 'react';
import {
    MaterialReactTable,
    useMaterialReactTable,
    MRT_ToggleFiltersButton,
    MRT_ShowHideColumnsButton,
    MRT_ToggleDensePaddingButton,
    MRT_ToggleFullScreenButton,
    MRT_ToolbarAlertBanner,
    MRT_LinearProgressBar,
    MRT_BottomToolbar,
} from 'material-react-table';
import { Box, IconButton, TextField, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import TableHorizontalScrollbar from './TableHorizontalScrollbar.jsx';
import useFillToBottom, { TOP_GAP, BOTTOM_GAP } from './useFillToBottom.js';
import { readColumnVisibility, writeColumnVisibility } from '../../lib/storage.js';

const SURFACE = '#faf8ff';
const SURFACE_SHADOW = '0 2px 8px rgba(100, 108, 130, 0.10)';
const PAPER = '#ffffff';
const DIVIDER = 'rgba(0, 0, 0, 0.12)';
const ROW_HOVER = 'rgba(0, 0, 0, 0.04)';
const ROW_STRIPE = 'rgba(0, 0, 0, 0.015)';

const headerSurfaceSx = {
    background: SURFACE,
    boxShadow: SURFACE_SHADOW,
};

const DISPLAY_COLUMN_DEFAULTS = {
    'mrt-row-expand': {
        muiTableBodyCellProps: {
            sx: { borderTop: 'none' },
        },
    },
    'mrt-row-actions': {
        header: 'Acción',
        size: 120,
        grow: false,
        muiTableHeadCellProps: { align: 'center' },
        muiTableBodyCellProps: { align: 'center' },
    },
};

// merge por columna: un override de la pagina (p. ej. { header: 'Opciones' })
// solo debe pisar esa clave, no reemplazar todo el default de la columna
const mergeDisplayColumnDefOptions = (overrides = {}) => {
    const merged = { ...DISPLAY_COLUMN_DEFAULTS };
    for (const [columnId, override] of Object.entries(overrides)) {
        merged[columnId] = { ...(DISPLAY_COLUMN_DEFAULTS[columnId] ?? {}), ...override };
    }
    return merged;
};

export default function Table({
                                  columns,
                                  data,
                                  loading = false,
                                  error = null,
                                  enableRowActions = false,
                                  renderRowActions,
                                  renderDetailPanel,
                                  enableRowSelection = false,
                                  rowSelection,
                                  onRowSelectionChange,
                                  enablePagination = true,
                                  enableColumnFilters = true,
                                  enableGlobalFilter = true,
                                  enableDensityToggle = true,
                                  enableFullScreenToggle = true,
                                  enableColumnActions = true,
                                  enableHiding = true,
                                  enableStickyHeader = true,
                                  enableStickyFooter = true,
                                  maxHeight,
                                  fillToBottom = true,
                                  storageKey,
                                  tableOptions = {},
                              }) {
    'use no memo';
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTouch = useMediaQuery('(pointer: coarse)');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false);
    const fillsToBottom = fillToBottom && !maxHeight;

    const [columnVisibility, setColumnVisibility] = useState(
        () => (storageKey ? readColumnVisibility(storageKey) : {}),
    );

    const handleColumnVisibilityChange = (updater) => {
        const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
        setColumnVisibility(next);
        writeColumnVisibility(storageKey, next);
    };

    const stableColumns = useMemo(() => columns, [columns]);
    const tableOptionsState = tableOptions.state ?? {};
    const tableOptionsInitialState = tableOptions.initialState ?? {};

    const mergedState = {
        ...tableOptionsState,
        isLoading: loading,
        showLoadingOverlay: false,
        showProgressBars: loading,
        showAlertBanner: !!error,
        ...(enableRowSelection && rowSelection != null ? { rowSelection } : {}),
        ...(storageKey ? { columnVisibility } : {}),
    };

    const table = useMaterialReactTable({
        ...tableOptions,
        ...(storageKey ? { onColumnVisibilityChange: handleColumnVisibilityChange } : {}),
        columns: stableColumns,
        data: data ?? [],
        getRowId: (row) => row.id,
        state: mergedState,

        enableRowActions,
        renderRowActions,
        renderDetailPanel: renderDetailPanel
            ? (props) => (
                <Box
                    sx={{
                        width: '100%',
                        borderBottom: '1px solid',
                        borderBottomColor: DIVIDER,
                        borderTop: '1px solid',
                        borderTopColor: DIVIDER,
                    }}
                >
                    {renderDetailPanel(props)}
                </Box>
            )
            : undefined,
        positionActionsColumn: tableOptions.positionActionsColumn ?? 'last',
        enableRowSelection,
        onRowSelectionChange,
        enablePagination,
        enableColumnFilters,
        columnFilterDisplayMode: 'subheader',
        enableGlobalFilter,
        enableDensityToggle,
        enableFullScreenToggle,
        enableColumnActions,
        enableHiding,
        enableSorting: true,
        enableStickyHeader,
        enableStickyFooter,
        enableTopToolbar: true,
        enableBottomToolbar: enablePagination,

        muiTableContainerProps: () => ({
            sx: {
                overflowX: isTouch ? 'auto' : 'hidden',
                overflowY: 'auto',
                ...(maxHeight
                    ? { maxHeight }
                    : {
                        flex: '1 1 auto',
                        minHeight: 0,
                        height: 'auto',
                        maxHeight: 'none',
                    }),
            },
        }),

        paginationDisplayMode: 'pages',
        initialState: {
            density: 'comfortable',
            pagination: { pageIndex: 0, pageSize: 10 },
            showColumnFilters: false,
            ...tableOptionsInitialState,
        },

        localization: MRT_Localization_ES,

        mrtTheme: {
            baseBackgroundColor: SURFACE,
        },

        muiTableProps: {
            sx: { backgroundColor: SURFACE },
        },

        muiTablePaperProps: ({ table }) => ({
            elevation: 0,
            sx: {
                backgroundColor: SURFACE,
                border: '1px solid',
                borderColor: DIVIDER,
                borderRadius: `${theme.shape.borderRadius}px`,
                overflow: table.getState().isFullScreen ? 'hidden' : 'clip',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxSizing: 'border-box',
                ...(table.getState().isFullScreen ? {} : { height: '100%', minHeight: 0 }),
                '& .Mui-TableHeadCell-Content-Actions': {
                    transition: 'opacity 150ms ease',
                    marginLeft: '4px',
                },
                '& th:hover .Mui-TableHeadCell-Content-Actions': {
                    opacity: 1,
                },
            },
        }),

        renderTopToolbar: ({ table }) => {
            const toolbarSx = { ...headerSurfaceSx, position: 'relative' };
            const actionIcons = (
                <>
                    {enableColumnFilters && <MRT_ToggleFiltersButton table={table} />}
                    {enableHiding && <MRT_ShowHideColumnsButton table={table} />}
                    {enableDensityToggle && <MRT_ToggleDensePaddingButton table={table} />}
                    {enableFullScreenToggle && <MRT_ToggleFullScreenButton table={table} />}
                </>
            );
            if (isMobile && isMobileSearchOpen) {
                return (
                    <Box sx={toolbarSx}>
                        <MRT_LinearProgressBar isTopToolbar table={table} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', p: 1, gap: 1 }}>
                            <TextField
                                autoFocus
                                fullWidth
                                size="small"
                                variant="outlined"
                                placeholder="Buscar..."
                                value={table.getState().globalFilter ?? ''}
                                onChange={(e) => table.setGlobalFilter(e.target.value)}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <IconButton
                                                size="small"
                                                edge="end"
                                                onClick={() => {
                                                    table.setGlobalFilter('');
                                                    setIsMobileSearchOpen(false);
                                                }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        ),
                                    },
                                }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                {actionIcons}
                            </Box>
                        </Box>
                        <MRT_ToolbarAlertBanner stackAlertBanner table={table} />
                    </Box>
                );
            }
            if (isMobile) {
                return (
                    <Box sx={toolbarSx}>
                        <MRT_LinearProgressBar isTopToolbar table={table} />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 1, py: 0.5 }}>
                            {enableGlobalFilter && (
                                <IconButton size="small" onClick={() => setIsMobileSearchOpen(true)}>
                                    <SearchIcon fontSize="small" />
                                </IconButton>
                            )}
                            {actionIcons}
                        </Box>
                        <MRT_ToolbarAlertBanner stackAlertBanner table={table} />
                    </Box>
                );
            }
            return (
                <Box sx={toolbarSx}>
                    <MRT_LinearProgressBar isTopToolbar table={table} />
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 0.5 }}>
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                            {enableGlobalFilter && (
                                isDesktopSearchOpen ? (
                                    <TextField
                                        autoFocus
                                        size="small"
                                        variant="outlined"
                                        placeholder="Buscar..."
                                        value={table.getState().globalFilter ?? ''}
                                        onChange={(e) => table.setGlobalFilter(e.target.value)}
                                        sx={{ width: 250 }}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <IconButton
                                                        size="small"
                                                        edge="end"
                                                        onClick={() => {
                                                            table.setGlobalFilter('');
                                                            setIsDesktopSearchOpen(false);
                                                        }}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                ),
                                            },
                                        }}
                                    />
                                ) : (
                                    <IconButton size="small" onClick={() => setIsDesktopSearchOpen(true)}>
                                        <SearchIcon fontSize="small" />
                                    </IconButton>
                                )
                            )}
                            {actionIcons}
                        </Box>
                    </Box>
                    <MRT_ToolbarAlertBanner stackAlertBanner table={table} />
                </Box>
            );
        },

        renderBottomToolbar: enablePagination
            ? ({ table }) => (
                <Box
                    sx={{
                        ...headerSurfaceSx,
                        // item normal del flex del paper (no absolute) para que el
                        // contenedor scrolleable termine justo donde empieza el
                        // toolbar y la barra vertical no se meta debajo de el
                        flex: '0 0 auto',
                        position: 'relative',
                        zIndex: 3,
                        borderTop: '1px solid',
                        borderTopColor: DIVIDER,
                    }}
                >
                    {!isTouch && (
                        <TableHorizontalScrollbar containerRef={table.refs.tableContainerRef} />
                    )}
                    <MRT_BottomToolbar table={table} />
                </Box>
            )
            : undefined,

        muiBottomToolbarProps: {
            sx: { ...headerSurfaceSx, position: 'relative', boxShadow: 'none' },
        },

        muiTableHeadCellProps: {
            sx: {
                ...headerSurfaceSx,
                fontWeight: 600,
                fontSize: '0.9rem',
                border: 'none',
                '&:focus, &:focus-within': { outline: 'none' },
            },
        },

        muiTableBodyCellProps: {
            sx: {
                backgroundColor: SURFACE,
                fontSize: '0.9rem',
                borderTop: '1px solid',
                borderTopColor: DIVIDER,
                '&:focus, &:focus-within': { outline: 'none' },
            },
        },

        muiTableBodyRowProps: {
            sx: {
                backgroundColor: SURFACE,
                '&:hover td': { backgroundColor: ROW_HOVER },
                '&:last-of-type td': {
                    borderBottom: '1px solid',
                    borderBottomColor: DIVIDER,
                },
                '&:nth-of-type(even) td': {
                    backgroundColor: ROW_STRIPE,
                },
            },
        },

        muiDetailPanelProps: {
            sx: {
                backgroundColor: PAPER,
                padding: 0,
            },
        },

        muiExpandButtonProps: ({ row }) => ({
            sx: {
                '& svg': {
                    transition: 'transform 200ms ease',
                    transform: row.getIsExpanded() ? 'rotate(-90deg) !important' : 'rotate(0deg) !important',
                },
            },
        }),

        muiLinearProgressProps: ({ isTopToolbar }) => ({
            sx: { display: isTopToolbar ? undefined : 'none' },
        }),

        muiSearchTextFieldProps: {
            variant: 'outlined',
            size: 'small',
        },

        muiPaginationProps: {
            rowsPerPageOptions: [10, 20, 50],
            shape: 'rounded',
            variant: 'outlined',
            size: 'small',
        },

        muiToolbarAlertBannerProps: error
            ? { color: 'error', children: error }
            : undefined,

        displayColumnDefOptions: mergeDisplayColumnDefOptions(
            tableOptions.displayColumnDefOptions,
        ),

    });

    const isFullScreen = table.getState().isFullScreen;
    const { slotRef, paneRef } = useFillToBottom(fillsToBottom && !isFullScreen);

    if (!fillsToBottom) return <MaterialReactTable table={table} />;

    return (
        <Box
            ref={slotRef}
            sx={{
                // El alto es exactamente el máximo que puede tomar el pane, y el margen
                // es el aire que lo separa del footer de la página.
                height: `calc(100dvh - ${TOP_GAP + BOTTOM_GAP}px)`,
                marginBottom: `${BOTTOM_GAP}px`,
            }}
        >
            <Box
                ref={paneRef}
                sx={
                    isFullScreen
                        ? { height: '100%' }
                        : { position: 'sticky', top: `${TOP_GAP}px` }
                }
            >
                <MaterialReactTable table={table} />
            </Box>
        </Box>
    );
}
