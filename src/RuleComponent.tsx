import React, {useState} from 'react';
import { useDrag, useDrop, DropTargetMonitor } from 'react-dnd';

type DelegationRule = { unique: string, condition: string, action: string, delegation: string };
type Props = {
	rule: DelegationRule;
	index: number;
	moveRule: (fromIndex: number, toIndex: number) => void;
	onDelete: (rule: DelegationRule) => void;
	selectMember: React.Dispatch<React.SetStateAction<string>>;
};

const RuleComponent: React.FC<Props> = ({ rule, index, moveRule, onDelete, selectMember }) => {
	const ref = React.useRef(null);
	const [showDeleteIcon, setShowDeleteIcon] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);
	
	const [, drop] = useDrop({
		accept: 'RULE',
		hover: (item: { index: number }, monitor: DropTargetMonitor) => {
			if (!ref.current) {
				return;
			}
			
			const dragIndex = item.index;
			const hoverIndex = index;
			
			if (dragIndex === hoverIndex) {
				return;
			}
			
			// Reorder the rules
			moveRule(dragIndex, hoverIndex);
			
			// Update the index for dragged item directly to avoid flickering
			item.index = hoverIndex;
		},
	});
	
	const [{ isDragging }, drag] = useDrag({
		type: 'RULE',
		item: { index },
		collect: (monitor: any) => ({
			isDragging: monitor.isDragging(),
		}),
	});
	
	drag(drop(ref));
	
	return (
		<div ref={ref} onMouseEnter={() => {setShowDeleteIcon(true); selectMember(rule.delegation);}} onMouseLeave={() => setShowDeleteIcon(false)} style={{ opacity: isDragging ? 0 : 1, fontSize: '20px', border: '1px solid grey', padding: '10px', margin: '10px 50px' }}>
			{showConfirmation ? (
				<div>
					Are you sure you want to delete this rule?
					<button style={{ margin: '0px 5px' }} onClick={() => { onDelete(rule); setShowConfirmation(false); }}>Yes</button>
					<button style={{ margin: '0px 5px' }} onClick={() => setShowConfirmation(false)}>No</button>
				</div>
			) : (
				<div>
					{rule.condition} - {rule.action}
					{showDeleteIcon && (
						<span>
							<button onClick={() => setShowConfirmation(true)}>🗑️</button>
						</span>
					)}
				</div>
			)}

		</div>
	);
};

export default RuleComponent;