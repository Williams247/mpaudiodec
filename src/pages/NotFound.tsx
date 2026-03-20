import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Music } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex flex-col items-center justify-center px-4 pb-32">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-green-500 p-3 rounded-lg">
            <Music className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-4xl font-bold text-white">SONIC</h1>
        </div>
        <p className="text-6xl font-bold text-white mb-4">404</p>
        <p className="text-xl text-zinc-400 mb-8">Page not found</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
