import React, { useCallback } from 'react';
import RuleComponent from './RuleComponent';

type DelegationRule = { unique: string, condition: string, action: string, delegation: string };
type Props = {
	rules: DelegationRule[];
	setRules: React.Dispatch<React.SetStateAction<DelegationRule[]>>;
	selectMember: React.Dispatch<React.SetStateAction<string>>;
};

const RuleList: React.FC<Props> = ({ rules, setRules, selectMember }) => {
	const moveRule = useCallback(
		(fromIndex: number, toIndex: number) => {
			const updatedRules = [...rules];
			const [movedRule] = updatedRules.splice(fromIndex, 1);
			updatedRules.splice(toIndex, 0, movedRule);
			setRules(updatedRules);
		},
		[rules, setRules]
	);
	const onDelete = (ruleToDelete: DelegationRule) => {
		setRules(rules => rules.filter(rule => rule.unique !== ruleToDelete.unique));
	};
	
	return (
		<div>
			{rules.map((rule, index) => (
				<RuleComponent key={rule.unique} index={index} moveRule={moveRule} rule={rule} onDelete={onDelete} selectMember={selectMember}  />
			))}
		</div>
	);
};

export default RuleList;