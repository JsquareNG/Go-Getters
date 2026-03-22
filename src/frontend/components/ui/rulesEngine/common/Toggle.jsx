// export default function Toggle({ checked, onChange }) {
//   return (
//     <button
//       type="button"
//       onClick={onChange}
//       className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
//         checked ? "bg-green-600" : "bg-gray-300"
//       }`}
//     >
//       <span
//         className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
//           checked ? "translate-x-6" : "translate-x-1"
//         }`}
//       />
//     </button>
//   );
// }

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  title = "",
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      title={disabled ? title : ""}
      aria-disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-green-600" : "bg-gray-300"
      } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}