export default function Header() {
  return (
    <header className="bg-primary shadow-md z-10">
      <div className="px-4 py-3 flex justify-between items-center">
        <h1 className="text-white text-xl font-medium">FreshSave</h1>
        <div className="flex items-center space-x-3">
          <button className="text-white p-1">
            <span className="material-icons">search</span>
          </button>
          <button className="text-white p-1">
            <span className="material-icons">notifications</span>
          </button>
        </div>
      </div>
    </header>
  );
}
