import React from "react";

const SkeletonLoading = ({ Rows, Cols }) => {
  return (
    <>
      {Array.from({ length: Rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td colSpan={Cols} className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded"></div>
          </td>
        </tr>
      ))}
    </>
  );
};

export default SkeletonLoading;
