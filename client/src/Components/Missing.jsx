import React from 'react';

const Missing = () => {
  return (
    <div className="min-h-screen flex flex-grow items-center justify-center bg-gray-50 z-20">
      <div className="rounded-lg bg-white p-8 text-center shadow-xl">
        <h1 className="mb-4 text-4xl text-red-500 font-bold">404</h1>
        <div className="animate-bounce">
          <svg
            className="mx-auto h-16 w-16 text-red-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600 text-xl">
          Oops! The page you are looking for could not be found.
        </p>

        {/* Button-styled anchor with proper cursor and focus behavior */}
        <a
          href="/"
          className="mt-6 inline-block rounded-sm bg-blue-500 hover:bg-blue-600 px-4 py-2 font-semibold text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
        >
          Home
        </a>
      </div>
    </div>
  );
};

export default Missing;
