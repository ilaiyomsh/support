interface LinkStatusChipProps {
  isActive: boolean;
}

export default function LinkStatusChip({ isActive }: LinkStatusChipProps) {
  return (
    <span className={isActive ? 'chip chip-active' : 'chip chip-inactive'}>
      {isActive ? 'פעיל' : 'לא פעיל'}
    </span>
  );
}

