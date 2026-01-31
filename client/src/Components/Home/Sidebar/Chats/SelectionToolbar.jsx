import PropTypes from 'prop-types';
import { Delete, DeleteForever, Close } from '@mui/icons-material';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';

const SelectionToolbar = ({
  selectedCount,
  canDeleteForEveryone,
  onDeleteForMe,
  onDeleteForEveryone,
  onCancel,
}) => {
  const colors = useSubscriptionColors();

  return (
    <div className="border-t border-light-secondary/10 dark:border-dark-secondary/10 bg-light-primary dark:bg-dark-primary px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-light-secondary/10 dark:hover:bg-dark-secondary/10 transition-colors"
          >
            <Close sx={{ fontSize: 20 }} className="text-light-text/60 dark:text-dark-text/60" />
          </button>
          <span className="text-sm font-medium text-light-text dark:text-dark-text">
            {selectedCount} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDeleteForMe}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-red-500/10 text-red-500"
          >
            <Delete sx={{ fontSize: 18 }} />
            <span>Delete for me</span>
          </button>

          <button
            onClick={onDeleteForEveryone}
            disabled={!canDeleteForEveryone || selectedCount === 0}
            title={!canDeleteForEveryone ? "Only your own messages from today can be deleted for everyone" : ""}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              color: canDeleteForEveryone ? colors.third : undefined,
              backgroundColor: canDeleteForEveryone ? `${colors.third}15` : undefined,
            }}
          >
            <DeleteForever sx={{ fontSize: 18 }} />
            <span>Delete for everyone</span>
          </button>
        </div>
      </div>
    </div>
  );
};

SelectionToolbar.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  canDeleteForEveryone: PropTypes.bool.isRequired,
  onDeleteForMe: PropTypes.func.isRequired,
  onDeleteForEveryone: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default SelectionToolbar;
