
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Database, Table, Column, Row } from './types';
import { ColumnType } from './types';
import { exportTableToPDF } from './services/pdfService';

// --- ICONS (self-contained SVG components) ---
const Icon = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">{children}</svg>
);
const PlusIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></Icon>;
const TrashIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></Icon>;
const EditIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></Icon>;
const TableIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></Icon>;
const LogoutIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></Icon>;
const DownloadIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></Icon>;
const MailIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></Icon>;
const XIcon = () => <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></Icon>;


// --- MOCK DATABASE HOOK ---
const initialDatabase: Database = {
  'tbl_users': {
    id: 'tbl_users', name: 'Users',
    columns: [
      { id: 'col_name', name: 'Full Name', type: ColumnType.TEXT },
      { id: 'col_email', name: 'Email', type: ColumnType.TEXT },
      { id: 'col_signup', name: 'Signup Date', type: ColumnType.DATE },
      { id: 'col_active', name: 'Is Active', type: ColumnType.BOOLEAN },
    ],
    rows: [
      { _id: 'row_1', col_name: 'Alice Johnson', col_email: 'alice@example.com', col_signup: '2023-01-15', col_active: true },
      { _id: 'row_2', col_name: 'Bob Williams', col_email: 'bob@example.com', col_signup: '2023-02-20', col_active: false },
    ],
  },
  'tbl_products': {
    id: 'tbl_products', name: 'Products',
    columns: [
      { id: 'col_prod_name', name: 'Product Name', type: ColumnType.TEXT },
      { id: 'col_price', name: 'Price', type: ColumnType.NUMBER },
      { id: 'col_stock', name: 'In Stock', type: ColumnType.NUMBER },
      { id: 'col_img', name: 'Image', type: ColumnType.IMAGE },
    ],
    rows: [
      { _id: 'row_p1', col_prod_name: 'Quantum Laptop', col_price: 1200.50, col_stock: 15, col_img: null },
      { _id: 'row_p2', col_prod_name: 'Nova Mouse', col_price: 75.00, col_stock: 120, col_img: null },
    ],
  },
};

const useMockDatabase = () => {
  const [db, setDb] = useState<Database>(initialDatabase);

  const generateId = (prefix: string) => `${prefix}_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

  const createTable = useCallback((name: string, columns: Omit<Column, 'id'>[]) => {
    const tableId = generateId('tbl');
    const newColumns = columns.map(c => ({ ...c, id: generateId('col') }));
    const newTable: Table = { id: tableId, name, columns: newColumns, rows: [] };
    setDb(prevDb => ({ ...prevDb, [tableId]: newTable }));
  }, []);

  const deleteTable = useCallback((tableId: string) => {
    setDb(prevDb => {
      const newDb = { ...prevDb };
      delete newDb[tableId];
      return newDb;
    });
  }, []);

  const addRow = useCallback((tableId: string, rowData: Omit<Row, '_id'>) => {
    const rowId = generateId('row');
    const newRow = { _id: rowId, ...rowData };
    setDb(prevDb => {
      const table = prevDb[tableId];
      if (!table) return prevDb;
      const updatedTable = { ...table, rows: [...table.rows, newRow] };
      return { ...prevDb, [tableId]: updatedTable };
    });
  }, []);

  const updateRow = useCallback((tableId: string, rowId: string, updatedData: Partial<Row>) => {
    setDb(prevDb => {
      const table = prevDb[tableId];
      if (!table) return prevDb;
      const updatedRows = table.rows.map(row => row._id === rowId ? { ...row, ...updatedData } : row);
      const updatedTable = { ...table, rows: updatedRows };
      return { ...prevDb, [tableId]: updatedTable };
    });
  }, []);
  
  const deleteRow = useCallback((tableId: string, rowId: string) => {
    setDb(prevDb => {
      const table = prevDb[tableId];
      if (!table) return prevDb;
      const updatedRows = table.rows.filter(row => row._id !== rowId);
      const updatedTable = { ...table, rows: updatedRows };
      return { ...prevDb, [tableId]: updatedTable };
    });
  }, []);

  return { db, createTable, deleteTable, addRow, updateRow, deleteRow };
};

// --- REUSABLE UI COMPONENTS ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}
const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = "px-4 py-2 rounded-md font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };
  return <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>{children}</button>;
};

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input ref={ref} {...props} className={`w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${props.className}`} />
));

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => (
    <select ref={ref} {...props} className={`w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${props.className}`}>
        {props.children}
    </select>
));


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- AUTH COMPONENTS ---
interface AuthPageProps {
  onLogin: (user: User) => void;
}
const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        onLogin({ id: 'user_123', email });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">Pro DB Manager</h1>
                    <p className="mt-2 text-gray-400">{isLogin ? 'Welcome back!' : 'Create your account'}</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <Input name="email" type="email" placeholder="Email address" required />
                    <Input name="password" type="password" placeholder="Password" required />
                    {!isLogin && <Input name="confirmPassword" type="password" placeholder="Confirm Password" required />}
                    <Button type="submit" className="w-full">{isLogin ? 'Sign In' : 'Sign Up'}</Button>
                </form>
                <p className="text-center text-sm text-gray-400">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-blue-400 hover:text-blue-300 ml-1">
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>
            </div>
        </div>
    );
};

// --- DASHBOARD COMPONENTS ---
interface DashboardPageProps {
  user: User;
  onLogout: () => void;
  db: Database;
  dbActions: ReturnType<typeof useMockDatabase>;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout, db, dbActions }) => {
  const tableIds = useMemo(() => Object.keys(db), [db]);
  const [activeTableId, setActiveTableId] = useState<string | null>(tableIds.length > 0 ? tableIds[0] : null);
  const [activeView, setActiveView] = useState<'db' | 'mail'>('db');

  const [isCreateTableModalOpen, setCreateTableModalOpen] = useState(false);
  
  useEffect(() => {
    if (!activeTableId && tableIds.length > 0) {
      setActiveTableId(tableIds[0]);
    }
    if (activeTableId && !db[activeTableId]) {
      setActiveTableId(tableIds.length > 0 ? tableIds[0] : null);
    }
  }, [tableIds, activeTableId, db]);

  const activeTable = activeTableId ? db[activeTableId] : null;

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar 
        db={db} 
        activeId={activeTableId}
        onSelectTable={setActiveTableId}
        activeView={activeView}
        onSelectView={setActiveView}
        onCreateTable={() => setCreateTableModalOpen(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-800 p-6">
          {activeView === 'db' && activeTable ? (
             <TableViewer key={activeTable.id} table={activeTable} dbActions={dbActions} />
          ) : activeView === 'db' && tableIds.length === 0 ? (
            <div className="text-center text-gray-400 p-10">
                <h2 className="text-2xl font-semibold">No tables found</h2>
                <p className="mt-2">Create your first table to get started.</p>
                <Button onClick={() => setCreateTableModalOpen(true)} className="mt-4">
                    <div className="flex items-center gap-2"><PlusIcon/> Create Table</div>
                </Button>
            </div>
          ) : activeView === 'mail' ? (
            <div className="text-center text-gray-400 p-10">
              <h2 className="text-2xl font-semibold">Mailbox</h2>
              <p className="mt-2">This is a placeholder for the email system functionality.</p>
            </div>
          ) : null }
        </main>
      </div>
      <CreateTableModal 
        isOpen={isCreateTableModalOpen} 
        onClose={() => setCreateTableModalOpen(false)} 
        onCreate={dbActions.createTable}
      />
    </div>
  );
};

interface SidebarProps {
  db: Database;
  activeId: string | null;
  onSelectTable: (id: string) => void;
  activeView: 'db' | 'mail';
  onSelectView: (view: 'db' | 'mail') => void;
  onCreateTable: () => void;
}
const Sidebar: React.FC<SidebarProps> = ({ db, activeId, onSelectTable, activeView, onSelectView, onCreateTable }) => (
  <aside className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
    <div className="h-16 flex items-center justify-center text-xl font-bold border-b border-gray-700">
      Pro DB Manager
    </div>
    <nav className="flex-1 px-4 py-4 space-y-2">
      <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tables</h3>
      {Object.values(db).map(table => (
        <a key={table.id} href="#" onClick={(e) => { e.preventDefault(); onSelectView('db'); onSelectTable(table.id); }}
           className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${activeId === table.id && activeView === 'db' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
          <TableIcon /> <span className="ml-3">{table.name}</span>
        </a>
      ))}
       <Button onClick={onCreateTable} className="w-full mt-2 !bg-gray-700 hover:!bg-gray-600">
         <div className="flex items-center justify-center gap-2"><PlusIcon/> New Table</div>
       </Button>

      <h3 className="px-2 pt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</h3>
      <a href="#" onClick={(e) => { e.preventDefault(); onSelectView('mail'); }}
           className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${activeView === 'mail' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
          <MailIcon /> <span className="ml-3">Mailbox</span>
      </a>
    </nav>
  </aside>
);

const Header: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <header className="h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-end px-6">
    <div className="flex items-center">
      <span className="text-sm text-gray-300 mr-4">{user.email}</span>
      <button onClick={onLogout} className="text-gray-400 hover:text-white" title="Logout">
        <LogoutIcon />
      </button>
    </div>
  </header>
);

interface TableViewerProps {
    table: Table;
    dbActions: ReturnType<typeof useMockDatabase>;
}

const TableViewer: React.FC<TableViewerProps> = ({ table, dbActions }) => {
    const [isAddRowModalOpen, setAddRowModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<Row | null>(null);

    const handleExport = () => {
        exportTableToPDF(table);
    };
    
    const renderCellContent = (row: Row, column: Column) => {
        const value = row[column.id];
        if (column.type === ColumnType.IMAGE && value) {
            return <img src={value} alt="upload" className="h-10 w-10 object-cover rounded"/>
        }
        if(column.type === ColumnType.BOOLEAN) {
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{value ? 'Yes' : 'No'}</span>
        }
        return <span className="truncate">{String(value ?? '')}</span>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{table.name}</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setAddRowModalOpen(true)}><div className="flex items-center gap-1"><PlusIcon/> Add Row</div></Button>
                    <Button variant="secondary" onClick={handleExport}><div className="flex items-center gap-1"><DownloadIcon/> Export PDF</div></Button>
                </div>
            </div>
            <div className="bg-gray-900 rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                        <tr>
                            {table.columns.map(col => (
                                <th key={col.id} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{col.name}</th>
                            ))}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-700">
                        {table.rows.map(row => (
                            <tr key={row._id} className="hover:bg-gray-800">
                                {table.columns.map(col => (
                                    <td key={col.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 max-w-xs">{renderCellContent(row, col)}</td>
                                ))}
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                    <div className="flex justify-end gap-4">
                                        <button onClick={() => setEditingRow(row)} className="text-blue-400 hover:text-blue-300"><EditIcon/></button>
                                        <button onClick={() => dbActions.deleteRow(table.id, row._id)} className="text-red-400 hover:text-red-300"><TrashIcon/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {table.rows.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No rows in this table.
                    </div>
                )}
            </div>
            <AddEditRowModal 
                isOpen={isAddRowModalOpen || !!editingRow} 
                onClose={() => { setAddRowModalOpen(false); setEditingRow(null); }}
                table={table}
                dbActions={dbActions}
                existingRow={editingRow}
            />
        </div>
    );
};

// --- MODALS ---
interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, columns: Omit<Column, 'id'>[]) => void;
}
const CreateTableModal: React.FC<CreateTableModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [tableName, setTableName] = useState('');
    const [columns, setColumns] = useState([{ name: '', type: ColumnType.TEXT }]);

    const handleAddColumn = () => {
        setColumns([...columns, { name: '', type: ColumnType.TEXT }]);
    };
    const handleColumnChange = (index: number, field: 'name' | 'type', value: string) => {
        const newColumns = [...columns];
        newColumns[index] = { ...newColumns[index], [field]: value };
        setColumns(newColumns);
    };
    const handleRemoveColumn = (index: number) => {
        setColumns(columns.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(tableName, columns.filter(c => c.name));
        setTableName('');
        setColumns([{ name: '', type: ColumnType.TEXT }]);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Table">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Table Name</label>
                    <Input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="e.g., Customers" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Columns</label>
                    <div className="space-y-3">
                        {columns.map((col, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={col.name} onChange={e => handleColumnChange(index, 'name', e.target.value)} placeholder="Column Name" className="flex-1" />
                                <Select value={col.type} onChange={e => handleColumnChange(index, 'type', e.target.value)} className="w-1/3">
                                    {Object.values(ColumnType).map(type => <option key={type} value={type}>{type}</option>)}
                                </Select>
                                <button type="button" onClick={() => handleRemoveColumn(index)} className="text-red-400 hover:text-red-300 p-2 rounded-full bg-gray-700">
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                     <Button type="button" variant="secondary" onClick={handleAddColumn} className="mt-3 w-full text-sm">
                        <div className="flex items-center justify-center gap-2"><PlusIcon/> Add Column</div>
                    </Button>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Create</Button>
                </div>
            </form>
        </Modal>
    );
};

interface AddEditRowModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table;
    dbActions: ReturnType<typeof useMockDatabase>;
    existingRow: Row | null;
}
const AddEditRowModal: React.FC<AddEditRowModalProps> = ({ isOpen, onClose, table, dbActions, existingRow }) => {
    const [rowData, setRowData] = useState<Partial<Row>>({});

    useEffect(() => {
        if (existingRow) {
            setRowData(existingRow);
        } else {
            setRowData({});
        }
    }, [existingRow, isOpen]);

    const handleInputChange = (colId: string, value: any) => {
        setRowData(prev => ({ ...prev, [colId]: value }));
    };

    const handleFileChange = (colId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleInputChange(colId, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (existingRow) {
            dbActions.updateRow(table.id, existingRow._id, rowData);
        } else {
            dbActions.addRow(table.id, rowData);
        }
        onClose();
    };

    const renderInputForType = (column: Column) => {
        const value = rowData[column.id] ?? '';
        switch(column.type) {
            case ColumnType.NUMBER:
                return <Input type="number" value={value} onChange={e => handleInputChange(column.id, e.target.valueAsNumber)} />;
            case ColumnType.DATE:
                return <Input type="date" value={value} onChange={e => handleInputChange(column.id, e.target.value)} />;
            case ColumnType.BOOLEAN:
                return (
                    <div className="h-10 flex items-center">
                        <input type="checkbox" checked={!!value} onChange={e => handleInputChange(column.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-700" />
                    </div>
                );
            case ColumnType.IMAGE:
                return <Input type="file" accept="image/*" onChange={e => handleFileChange(column.id, e)} />;
            case ColumnType.TEXT:
            default:
                return <Input type="text" value={value} onChange={e => handleInputChange(column.id, e.target.value)} />;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingRow ? `Edit Row` : `Add New Row to ${table.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {table.columns.map(col => (
                    <div key={col.id}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{col.name}</label>
                        {renderInputForType(col)}
                    </div>
                ))}
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">{existingRow ? 'Save Changes' : 'Add Row'}</Button>
                </div>
            </form>
        </Modal>
    );
}

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const dbState = useMockDatabase();

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };
  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return <DashboardPage user={user} onLogout={handleLogout} db={dbState.db} dbActions={dbState} />;
};

export default App;
