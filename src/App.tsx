import React, { useState, useEffect } from 'react';
import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import RuleList from './RuleList';
import { db } from './firebase';
import { collection, setDoc, doc, getDoc, updateDoc, getCountFromServer, onSnapshot, arrayUnion, arrayRemove, query, where, getDocs, writeBatch } from 'firebase/firestore';
import './App.css';

import crypto from 'crypto';

type GroupPreview = { unique: string, name: string };
type GroupData = { unique: string, name: string, description: string, founder: string, banned: Array<string>, invites: Array<string>, private: boolean, categories: Array<string> };
type RoleData = { name: string, canBan: boolean, canDemote: boolean, canPromote: boolean, canKick: boolean, canEditGroup: boolean, canEditRoles: boolean, createElections: boolean };
type UserData = { name: string, groups: Array<string>, hash: string, salt: string, iterations: number };
type ElectionData = { unique: string, name: string, description: string, creator: string, category: string[], closed: boolean, ended: boolean, options: string[], counts: number[], percentages: number[] };
type VoterData = { unique: string, vote: number, delegation: string, weight: number };
type DelegationRule = { unique: string, condition: string, action: string, delegation: string };
type MemberData = { username: string, displayName: string, role: string, hideID: boolean, rules: DelegationRule[] };

const defaultFounder: RoleData = { name: 'founder', canEditGroup: true, canEditRoles: true, canKick: true,
	canBan: true, createElections: true, canPromote: true, canDemote: true };
const defaultAdmin:RoleData = { name: 'admin', canEditGroup: false, canEditRoles: false, canKick: true,
	canBan: true, createElections: true, canPromote: false, canDemote: false };
const defaultMember:RoleData = { name: 'member', canEditGroup: false, canEditRoles: false, canKick: false,
	canBan: false, createElections: false, canPromote: false, canDemote: false };

function App() {
	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [userSnap, setUserSnap] = useState<UserData>();
	const [darkMode, setDarkMode] = useState(false);
	
	const [elections, setElections] = useState<ElectionData[]>([]);
	const [groupIDs, setGroupIDs] = useState<GroupPreview[]>([]);
	const [groupUnique, setGroupUnique] = useState("");
	const [groupTitle, setGroupTitle] = useState("");
	const [groupDescription, setGroupDescription] = useState("");
	const [groupPrivate, setGroupPrivate] = useState(false);
	const [groupMembers, setGroupMembers] = useState<MemberData[]>([]);
	const [memberCount, setMemberCount] = useState(0);
	const [groupRole, setGroupRole] = useState("member");
	const [groupDisplayName, setGroupDisplayName] = useState("");
	const [tempDisplayName, setTempDisplayName] = useState("");
	const [groupHiding, setGroupHiding] = useState(false);
	const [roles, setRoles] = useState<RoleData[]>([]);
	
	const [selectedRole, setSelectedRole] = useState<RoleData>(defaultMember);
	const [roleIndex, setRoleIndex] = useState(0);
	const [selectedMember, setSelectedMember] = useState("");
	const [selectedGroup, setSelectedGroup] = useState<GroupData>();
	const [selectedElection, setSelectedElection] = useState<ElectionData>();
	const [selectedVote, setSelectedVote] = useState(-1);
	const [isGroupSelected, setIsGroupSelected] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [matchingGroups, setMatchingGroups] = useState<GroupData[]>([]);
	const [groupFound, setGroupFound] = useState<GroupData[]>([]);
	
	const [electionUnique, setElectionUnique] = useState("");
	const [electionTitle, setElectionTitle] = useState("");
	const [electionDescription, setElectionDescription] = useState("");
	const [electionPrivate, setElectionPrivate] = useState(false);
	const [electionMembers, setElectionMembers] = useState<VoterData[]>([]);
	const [electionScores, setElectionScores] = useState<number[]>();
	const [electionCategories, setElectionCategories] = useState<string[]>([]);
	const [options, setOptions] = useState(['']);
	
	const [rules, setRules] = useState<Array<DelegationRule>>([]);
	const [categories, setCategories] = useState<string[]>([]);
	const [condition, setCondition] = useState<string>('');
	const [action, setAction] = useState<'delegate' | 'abstain'>('abstain');
	
	const [expDesc, setExpDesc] = useState(false); //toggles the expansion of the Group description when flipped
	
	const [isSignUp, setIsSignUp] = useState(false);
	const [loggedIn, setLoggedIn] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isFinding, setIsFinding] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isPermissions, setIsPermissions] = useState(false);
	const [isJoining, setIsJoining] = useState(false);
	const [isElections, setIsElections] = useState(false);
	const [editingDisplay, setEditingDisplay] = useState(false);
	const [isRules, setIsRules] = useState(false);
	
	const [errorMsg, setErrorMsg] = useState("");
	const [usernameError, setUsernameError] = useState(false);
	const [displayNameError, setDisplayNameError] = useState(false);
	const [passwordError, setPasswordError] = useState(false);
	const [confirmPasswordError, setConfirmPasswordError] = useState(false);
	
	
	const usersRef = collection(db, "users");
	const groupsRef = collection(db, "groups");
	const fetchingGroups: GroupData[] = [];
	
	const clearUserFields = () => {
		setUsername("");
		setDisplayName("");
		setPassword("");
		setConfirmPassword("");
		
		setElections([]);
		setGroupIDs([]);
		setGroupUnique("");
		setGroupTitle("");
		setGroupDescription("");
		setGroupPrivate(false);
		setGroupRole("member");
		setSelectedRole(defaultMember);
		setRoles([]);
	};
	const clearErrors = () => {
		setErrorMsg("");
		setUsernameError(false);
		setDisplayNameError(false);
		setPasswordError(false);
		setConfirmPasswordError(false);
	};
	/*
	const hashInput = (input: string, salt: string) => {
	  const iterations: number = 10000;
	  let hash: string = input;
	  for (let i = 0; i < iterations; i++) {
		const sha512 = crypto.createHash('sha512');
		sha512.update(hash + salt);
		hash = sha512.digest('hex');
	  }
	  //console.log(hash);
	  return hash;
	};
	*/
	
	const moveToSignUp = () => {
		setIsSignUp(true);
		setLoggedIn(false);
		clearUserFields();
		clearErrors();
		setIsCreating(false);
		setIsEditing(false);
		setIsFinding(false);
		setIsPermissions(false);
		setIsElections(false);
		setIsRules(false);
	};
	const moveToSignIn = () => {
		setIsSignUp(false);
		setLoggedIn(false);
		clearUserFields();
		clearErrors();
		setIsCreating(false);
		setIsEditing(false);
		setIsFinding(false);
		setIsPermissions(false);
		setIsElections(false);
		setIsRules(false);
	};
	const moveToLoggedIn = () => {
		clearErrors();
		setSelectedGroup(undefined);
		setLoggedIn(true);
		setIsCreating(false);
		setIsEditing(false);
		setIsFinding(false);
		setIsPermissions(false);
		setIsElections(false);
		setIsRules(false);
	};
	const moveToCreateGroup = () => {
		clearErrors();
		setCategories([]);
		setGroupUnique("");
		setGroupTitle("");
		setGroupDescription("");
		setGroupPrivate(false);
		setGroupDisplayName(displayName);
		setGroupHiding(false);
		setIsCreating(true);
		setIsEditing(false);
		setIsFinding(false);
		setIsPermissions(false);
		setIsElections(false);
		setIsRules(false);
	};
	const moveToEditPermissions = () => {
		clearErrors();
		if (selectedGroup) {
			setIsPermissions(true);
			setSelectedRole(roles[0]);
			setRoleIndex(0);
		}
	};
	const moveToFindGroup = () => {
		clearErrors();
		setSelectedGroup(undefined);
		setIsCreating(false);
		setIsEditing(false);
		setIsFinding(true);
		setIsPermissions(false);
		setIsElections(false);
		setIsRules(false);
	};
	const moveToEditGroup = () => {
		clearErrors();
		if (selectedGroup) {
			setGroupTitle(selectedGroup.name);
			setGroupDescription(selectedGroup.description);
			setGroupPrivate(selectedGroup.private);
			setCategories(selectedGroup.categories);
			setGroupUnique(selectedGroup.unique);
		}
		setIsCreating(false);
		setIsEditing(true);
		setIsFinding(false);
		setIsPermissions(false);
		setIsElections(false);
		setIsRules(false);
	};
	const moveToElections = () => {
		clearErrors();
		setElectionCategories([]);
		setElectionUnique("");
		setElectionTitle("");
		setElectionDescription("");
		setElectionPrivate(false);
		setOptions([""]);
		setLoggedIn(true);
		setIsElections(true);
		setIsCreating(false);
		setIsEditing(false);
		setIsFinding(false);
		setIsPermissions(false);
		setIsRules(false);
	};
	const moveToRules = async () => {
		if (selectedGroup) {
			setCategories(selectedGroup.categories);
			setAction("abstain");
			clearErrors();
			setLoggedIn(true);
			setIsElections(false);
			setIsCreating(false);
			setIsEditing(false);
			setIsFinding(false);
			setIsPermissions(false);
			setIsRules(true);
		}
	};
	
	
	//snapshot listener for group finding search
	const fetchGroups =  async (search: string) => {
		try {
			const fetchedGroups: GroupData[] = [];
			const groupsRef = collection(db, "groups");
			const q = query(
				groupsRef,
				where("name", ">=", searchQuery),
				where("name", "<", searchQuery + "\uf8ff"),
				where("isPrivate", "==", false)
			);
			const querySnapshot = await getDocs(q);
			querySnapshot.forEach((doc) => {
				fetchedGroups.push(doc.data() as GroupData);
			});
			setMatchingGroups(fetchedGroups);
		} catch (err) {
			console.error("Error fetching groups: ", err);
		}
		setSearchQuery(search);
	};
	//updates user's groups they are apart of
	const getGroups = async () => {
		try {
			const snap = await getDoc(doc(usersRef, username));
			setUserSnap(snap.data() as UserData);
			if (!(snap.exists())) {
				setUsernameError(true);
				setErrorMsg("User account not found");
				return;
			} else {
				const grArray = snap.data().groups;
				let arr: Array<GroupPreview> = [];
				for (const id of grArray) {
					//if (!(id in groupIDs)) {
						let docRef = doc(db, 'groups', id);
						let docSnap = await getDoc(docRef);
						if (docSnap.exists()) {
							//let data: GroupData = docSnap.data() as GroupData;
							arr.push({unique: docSnap.data().unique, name: docSnap.data().name});
						} else {
							setErrorMsg(`${id} group data is missing`);
						}
					//}
				}
				setGroupIDs(arr);
				//const groupsRef = collection(db, "groups");
				const q = query(groupsRef)
				const querySnapshot = await getDocs(q);
				querySnapshot.forEach((doc) => {
					fetchingGroups.push(doc.data() as GroupData);
				});
				setMatchingGroups(fetchingGroups);
				setGroupFound(fetchingGroups);
				setDisplayName(snap.data().name);
			}
		} catch (error) {
			setErrorMsg("There was a problem fetching group details");
		}
	}
	
	const selectGroup = async (unique: string) => {
		const data = await getDoc(doc(groupsRef, unique));
		const memRef = collection(doc(groupsRef, unique), 'members');
		const memDoc = await getDoc(doc(memRef, username));
		const count = await getCountFromServer(memRef);
		const electionRef = collection(doc(groupsRef, unique), 'elections');
		const rolesRef = collection(doc(groupsRef, unique), 'roles');
		if (data.exists()) {
			setSelectedGroup(data.data() as GroupData);
			//if (selectedGroup) {
			let user = memDoc.data() as MemberData;
			let userRole = user?.role || 'member'; // The ?. is optional chaining in case 'user' is undefined
			let name = user?.displayName || username;
			let hide = user?.hideID || false;
			let rules = user?.rules || [];
			
			let arr: MemberData[] = [];
			const query = await getDocs(memRef);
			query.forEach((doc) => {
				arr.push(doc.data() as MemberData);
			});
			setGroupMembers(arr);
			let el: ElectionData[] = [];
			const elections = await getDocs(electionRef);
			elections.forEach((election) => {
				el.push(election.data() as ElectionData);
			});
			setElections(el);
			let rol: RoleData[] = [];
			const roleQuery = await getDocs(rolesRef);
			roleQuery.forEach((role) => {
				rol.push(role.data() as RoleData);
			});
			setRoles(rol);
			
			//below is data for user
			setGroupHiding(hide);
			setGroupDisplayName(name);
			setTempDisplayName(name);
			setGroupRole(userRole);
			setRules(rules);
			setMemberCount(count.data().count);
			setIsGroupSelected(true);
			setSelectedVote(-1);
			setSelectedElection(undefined);
			setElectionScores(undefined);
			setSelectedMember("");
			//}
		} else {
			setErrorMsg("Group data could not be found");
		}
	};
	const selectMember = (unique: string) => {
		setSelectedMember(unique);
	};
	const selectRole = (role: RoleData, index: number) => {
		setSelectedRole(role);
		setRoleIndex(index);
	};
	
	/*
	//snapshot listener
	useEffect(() => {
		if(selectedGroup) {
			const groupRef = doc(db, 'groups', selectedGroup.unique);
			// This sets up the real-time listener.
			const unsubscribe = onSnapshot(groupRef, (snapshot) => {
				const updatedData = snapshot.data() as GroupData;
				selectGroup(updatedData); // Update local state with latest data.
			});
			// This makes sure we unsubscribe from the listener when the component unmounts.
			return unsubscribe;
		}
	}, [selectGroup, selectedGroup]);
	 */
	
	const hashPassword = (input: string) => {
		const salt: string = crypto.randomBytes(128).toString('base64');
		const iterations: number = 10000;
		let hash: string = input;
		for (let i = 0; i < iterations; i++) {
			const sha512 = crypto.createHash('sha512');
			sha512.update(hash + salt);
			hash = sha512.digest('hex');
		}
		return {
			salt: salt,
			hash: hash,
			iterations: iterations
		};
	};
	const checkPassword = (input: string, salt: string, iterations: number, saved: string ) => {
		let hash = input;
		for (let i = 0; i < iterations; i++) {
			const sha512 = crypto.createHash('sha512');
			sha512.update(hash + salt);
			hash = sha512.digest('hex');
		}
		return (hash === saved);
	};
	
	const handleDisplayUpdate = async () => {
		if (selectedGroup) {
			const unique = selectedGroup.unique;
			const groupRef = doc(groupsRef, selectedGroup.unique);
			const memRef = collection(groupRef, 'members');
			const docRef = doc(memRef, username);
			//const groupSnap = await getDoc(groupRef);
			//const oldGroupData = groupSnap.data() as GroupData;
			
			await updateDoc(docRef, { displayName: tempDisplayName, hideID: groupHiding });
			setGroupDisplayName(tempDisplayName);
			setEditingDisplay(false);
			moveToLoggedIn();
			await selectGroup(unique);
			/*
			const newUserData = {
				username: username,
				role: groupRole,
				displayName: groupDisplayName,
				hideID: groupHiding
			};
			let oldUserData = oldGroupData.members.find((member: MemberData) => member.username === username);
			
			if ((oldUserData) && ((oldUserData.hideID !== newUserData.hideID) || (oldUserData.displayName !== newUserData.displayName))) {
				// Use Firestore's arrayUnion and arrayRemove to update the member on the server.
				await updateDoc(groupRef, {
					members: arrayRemove(oldUserData) // Remove the old data.
				});
				await updateDoc(groupRef, {
					members: arrayUnion(newUserData) // Add the new data.
				});
				// Now update the local state.
				// Find the index of the member in the array.
				// could just get new group docSnap from Firestore
				const localGroupRef = groups.find((group) => group.unique === selectedGroup.unique) || oldGroupData;
				const memberIndex = localGroupRef.members?.findIndex((member: MemberData) => member.username === username);
				
				// Replace the old member data with the new one.
				localGroupRef.members[memberIndex] = newUserData;
				setGroupMembers(localGroupRef.members);
			}
			*/
		}
	}
	
	const handleSignUp = async (event: React.FormEvent) => {
		event.preventDefault();
		await clearErrors();
		
		if (password !== confirmPassword) {
			setPasswordError(true);
			setConfirmPasswordError(true);
			setErrorMsg("Passwords do not match");
			return;
		}
		try {
			const hashedPassword = hashPassword(password);
			await setDoc(doc(collection(db, "users"), username), {salt: hashedPassword.salt, hash: hashedPassword.hash, iterations: hashedPassword.iterations, name: displayName, groups: []});
			setGroupIDs([]);
			moveToLoggedIn();
			// user is signed up
		} catch (error) {
			setUsernameError(true);
			setErrorMsg("Username already exists. Please try a different one");
		}
	};
	
	const handleSignIn = async (event: React.FormEvent) => {
		event.preventDefault();
		await clearErrors();
		
		try {
			const snap = await getDoc(doc(usersRef, username));
			setUserSnap(snap.data() as UserData);
			let data: UserData = snap.data() as UserData;
			if (!(snap.exists())) {
				setUsernameError(true);
				setErrorMsg("User account not found");
				return;
			} else {
				if (!checkPassword(password, data.salt, data.iterations, data.hash)) {
					//const salt = userSnap.data()?.salt;
					//const hashed = hashInput('pass', salt);
					//await updateDoc(doc(collection(db, "users"), username), { hash: hashed });
					setPasswordError(true);
					setErrorMsg("Invalid Password");
					return;
				}
				await getGroups();
				setDisplayName(data.name);
				moveToLoggedIn();
			}
			// user is signed in
		} catch (error) {
			setUsernameError(true);
			setPasswordError(true);
			setErrorMsg("There was a problem signing in with these details");
		}
	};
	
	const handleGroupCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		await clearErrors();
		
		const data: GroupData = { unique: groupUnique, name: groupTitle, description: groupDescription, founder: username, banned: [], invites: [], private: groupPrivate, categories: [] };
		try {
			await setDoc(doc(collection(db, "groups"), groupUnique), data);
			const groupRef = doc(groupsRef, groupUnique);
			const rolesRef = collection(groupRef, 'roles');
			const memRef = collection(groupRef, 'members');
			const userRef = doc(usersRef, username);
			//const electionsRef = collection(groupRef, 'elections'); //check creation at the start of election creation
			await selectGroup(data.unique);
			await setDoc(doc(rolesRef, 'founder'), defaultFounder);
			await setDoc(doc(rolesRef, 'admin'), defaultAdmin);
			await setDoc(doc(rolesRef, 'member'), defaultMember);
			await setDoc(doc(memRef, username), { username: username, displayName: displayName, role: 'founder', hideID: false });
			await updateDoc(userRef, { groups: arrayUnion(groupUnique) });
			setRoles([defaultMember, defaultAdmin, defaultFounder]);
			groupIDs.push({ unique: groupUnique, name: groupDisplayName });
			//groups.push(data);
			setGroupRole('founder');
			moveToLoggedIn();
			await selectGroup(data.unique);
		} catch (error) {
			setUsernameError(true);
			setErrorMsg("Group Identifier already exists. Please try a different one");
		}
	};
	
	//for election options
	const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
		const newOptions = [...options];
		newOptions[index] = event.target.value;
		setOptions(newOptions);
	}
	const handleAddOption = () => {
		setOptions([...options, '']);
	}
	const handleDeleteOption = (index: number) => {
		const newOptions = [...options];
		newOptions.splice(index, 1);
		setOptions(newOptions);
	}
	//for election options
	const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
		const newCategories = [...categories];
		newCategories[index] = event.target.value;
		setCategories(newCategories);
	}
	const handleAddCategory = () => {
		setCategories([...categories, '']);
	}
	const handleDeleteCategory = (index: number) => {
		const newCategories = [...categories];
		newCategories.splice(index, 1);
		setCategories(newCategories);
	}
	const handleElectionCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		await clearErrors();
		const newOptions = ['abstain', ...options];
		// Create a vote counter array of the same length, populated with 0s
		const voteCounter = new Array(newOptions.length).fill(0);
		if (selectedGroup) {
			try {
				const unique = selectedGroup.unique;
				const groupRef = doc(groupsRef, unique);
				const electionRef = collection(groupRef, 'elections');
				const docRef = doc(electionRef, electionUnique);
				const voterRef = collection(docRef, 'voters');
				const data: ElectionData = {
					unique: electionUnique,
					name: electionTitle,
					description: electionDescription,
					creator: username,
					category: electionCategories,
					closed: electionPrivate,
					ended: false,
					options: newOptions,
					counts: voteCounter,
					percentages: voteCounter
				};
				await setDoc(docRef, data);
				try {
					const batch = writeBatch(db);
					groupMembers.forEach((voter) => {
						let delegation = '';
						let delFlag = false;
						voter.rules?.forEach((rule) => {
							if (electionCategories.includes(rule.condition)) {
								if ((rule.action === "delegate") && (!delFlag)) {
									if (groupMembers.find(voter => voter.username === rule.delegation)) {
										delegation = rule.delegation;
										delFlag = true;
									}
								}
							}
						});
						const voterDoc = doc(voterRef, voter.username);
						batch.set(voterDoc, {unique: voter.username, vote: 0, delegation: delegation, weight: 1});
					});
					await batch.commit();
				} catch (error) {
					console.log(error);
					setErrorMsg("Error occurred creating voter profiles");
				}
				moveToLoggedIn();
				await selectGroup(unique);
			} catch (error) {
				setErrorMsg("Election Identifier already exists. Please try a different one");
			}
		}
	}
	
	const handleGroupEdit = async (event: React.FormEvent) => {
		event.preventDefault();
		await clearErrors();
		const docRef = doc(collection(db, "groups"), groupUnique);
		await updateDoc(docRef, { name: groupTitle, description: groupDescription, private: groupPrivate, categories: categories });
		await cancel();
	};
	
	const toggleCategory = async (name: string) => {
		const existingCategory = electionCategories.find(cat => cat === name);
		if (existingCategory) {
			const filteredCategories = electionCategories.filter(cat => cat !== name);
			setElectionCategories(filteredCategories);
		} else {
			const newCat = [...electionCategories, name];
			setElectionCategories(newCat);
		}
	}
	const selectElection = async (unique: string) => {
		await clearErrors();
		await setElectionScores(undefined);
		if (selectedGroup) {
			const groupID: string = selectedGroup.unique;
			const electionDoc = doc(collection(doc(groupsRef, groupID), 'elections'), unique);
			const voterDoc = doc(collection(electionDoc, 'voters'), username);
			if (selectedElection) {
				if (selectedElection.unique !== unique) {
					setSelectedVote(-1);
				}
			}
			const data = await getDoc(electionDoc);
			if (data.exists()) {
				setSelectedElection(data.data() as ElectionData);
			}
			const voter = await getDoc(voterDoc);
			if (voter.exists()) {
				const vot = voter.data();
				if (vot.delegation !== "") {
					setSelectedVote(-1);
				} else {
					setSelectedVote(vot.vote);
				}
				setSelectedMember(vot.delegation);
			}
		}
	};
	const selectVote = async (option: number) => {
		setSelectedVote(option);
	};
	const calculateResult = async () => {
		await clearErrors();
		if (selectedGroup && selectedElection) {
			const electionDocRef = doc(collection(doc(groupsRef, selectedGroup.unique), 'elections'), selectedElection.unique);
			const voterCollection = collection(electionDocRef, 'voters');
			// 1. Initialize variables
			const voters: any[] = [];
			let voteCounts: number[] = Array(selectedElection.options.length).fill(0);
			// 2. Retrieve all voter data from Firestore
			const voterSnapshot = await getDocs(voterCollection);
			voterSnapshot.forEach((doc) => {
				let voter = doc.data();
				voter.weight = 1; // setting initial weight
				voter.delegated = new Set<string>(); // Initialize the set of voters who delegated to this voter
				voters.push(voter);
			});
			// 3. Resolve Delegations
			// Identify cycles and update the delegations as needed
			voters.forEach(voter => {
				const visited = new Set<string>();
				let currentVoter = voter;
				while (currentVoter.delegation !== "") {
					if (visited.has(currentVoter.unique)) {
						currentVoter.delegation = ""; // Break the cycle
						currentVoter.vote = 0; // Set vote to 0
						break;
					}
					visited.add(currentVoter.unique);
					currentVoter = voters.find(v => v.unique === currentVoter.delegation) || currentVoter;
				}
			});
			// Process delegation chains, allowing for merging
			voters.forEach((voter) => {
				let currentVoter = voter;
				while (currentVoter.delegation !== "") {
					currentVoter = voters.find((v) => v.unique === currentVoter.delegation) || currentVoter;
					currentVoter.delegated.add(voter.unique);
					currentVoter.delegated = new Set([...currentVoter.delegated, ...voter.delegated]);
				}
			});
			// 4. Calculate the vote tally based on weights
			let totalWeight = 0;
			voters.forEach(voter => {
				voter.weight = voter.delegated.size + 1; // Set the weight as the size of the set plus 1
				let delegateString = Array.from(voter.delegated).join (", ");
				console.log(`Voter: ${voter.unique}, weight: ${voter.weight}, vote: ${voter.vote}, delegation: ${voter.delegation}, delegates: ${delegateString}`);
				if ((voter.delegation === "") && (voter.vote < voteCounts.length)) {
					voteCounts[voter.vote] += voter.weight;
					totalWeight += voter.weight;
				}
			});
			// Check that totalWeight matches voters.length
			if (totalWeight !== voters.length) {
				console.error(`Error in calculating weights, calc: ${totalWeight}, total: ${voters.length}`);
			}
			// 5. Calculate the percentage vote for each option and update
			const percentageVotes = voteCounts.map((count) => {
				const percentage = (count / totalWeight) * 100;
				return Number(percentage.toFixed(1)); // round to one decimal place
			});
			await updateDoc(electionDocRef, { counts: voteCounts, percentages: percentageVotes });
			setElectionScores(percentageVotes);
		}
	};
	const handleVote = async () => {
		await clearErrors();
		if (selectedVote !== -1) {
			if (selectedGroup && selectedElection) {
				const electionDoc = doc(collection(doc(groupsRef, selectedGroup.unique), 'elections'), selectedElection.unique);
				const voterDoc = doc(collection(electionDoc, 'voters'), username);
				try {
					await updateDoc(voterDoc, {delegation: "", vote: selectedVote});
				} catch (error) {
					try {
						await setDoc(voterDoc, { delegation: "", unique: username, vote: selectedVote, weight: 1 })
					} catch (error) {
						setErrorMsg("error occurred submitting vote");
					}
				}
				//a vote is selected
				//update election tally
				await calculateResult();
				setSelectedVote(-1);
			}
		} else {
			//no vote selected
			setErrorMsg("no vote option is selected");
		}
	};
	const handleDelegation = async () => {
		await clearErrors();
		if (selectedMember) {
			//member selected from sidebar to delegate too
			if (selectedGroup && selectedElection) {
				const electionDoc = doc(collection(doc(groupsRef, selectedGroup.unique), 'elections'), selectedElection.unique);
				const voterDoc = doc(collection(electionDoc, 'voters'), username);
				try {
					await updateDoc(voterDoc, {delegation: selectedMember, vote: 0});
				} catch (error) {
					try {
						await setDoc(voterDoc, { delegation: selectedMember, unique: username, vote: 0, weight: 1 })
					} catch (error) {
						setErrorMsg("error occurred submitting delegation");
					}
				}
				//a vote is selected
				//update election tally
				await calculateResult();
				setSelectedVote(-1);
			}
		} else {
			setErrorMsg("To delegate your vote, select a group member from the member list on the right by clicking on them. The highlighted member can then be assigned your vote by using the Delegate Vote button");
		}
	}
	const handleJoin = async () => {
		if (selectedGroup) {
			const unique = selectedGroup.unique;
			const groupRef = doc(groupsRef, selectedGroup.unique);
			const memRef = collection(groupRef, 'members');
			const docRef = doc(memRef, username);
			const userRef = doc(usersRef, username);
			//const groupSnap = await getDoc(groupRef);
			//const oldGroupData = groupSnap.data() as GroupData;
			
			await setDoc(docRef, { username: username, displayName: tempDisplayName, role: 'member', hideID: groupHiding, rules: [] });
			await updateDoc(userRef, { groups: arrayUnion(selectedGroup.unique) });
			moveToLoggedIn();
			await getGroups();
			await selectGroup(unique);
			/*
			const newUserData = {
				username: username,
				role: groupRole,
				displayName: groupDisplayName,
				hideID: groupHiding
			};
			let oldUserData = oldGroupData.members.find((member: MemberData) => member.username === username);
			
			if ((oldUserData) && ((oldUserData.hideID !== newUserData.hideID) || (oldUserData.displayName !== newUserData.displayName))) {
				// Use Firestore's arrayUnion and arrayRemove to update the member on the server.
				await updateDoc(groupRef, {
					members: arrayRemove(oldUserData) // Remove the old data.
				});
				await updateDoc(groupRef, {
					members: arrayUnion(newUserData) // Add the new data.
				});
				// Now update the local state.
				// Find the index of the member in the array.
				// could just get new group docSnap from Firestore
				const localGroupRef = groups.find((group) => group.unique === selectedGroup.unique) || oldGroupData;
				const memberIndex = localGroupRef.members?.findIndex((member: MemberData) => member.username === username);
				
				// Replace the old member data with the new one.
				localGroupRef.members[memberIndex] = newUserData;
				setGroupMembers(localGroupRef.members);
			}
			*/
		}
	}
	const addRule = () => {
		let delegate = "";
		if (condition !== "") {
			if (action === "delegate") {
				if (selectedMember) {
					delegate = selectedMember;
				} else {
					setErrorMsg("please select a member to delegate to by clicking on them in the list on the right");
					return;
				}
			}
			const newRule: DelegationRule = {unique: `${condition} ${action}`, condition: condition, action: action, delegation: delegate};
			const existingRule = Array.from(rules).find(rule => rule.unique === newRule.unique);
			if (!existingRule) {
				setRules([...rules, newRule]);
			} else {
				setErrorMsg("A rule of this type already exists, if you would like to change a delegation rule, delete the existing one and create a replacement");
			}
		} else {
			setErrorMsg("please choose a valid category condition")
		}
	};
	const cancelRules = async () => {
		if (selectedGroup) {
			let unique = selectedGroup.unique;
			moveToLoggedIn();
			await selectGroup(unique);
		}
	};
	const saveRules = async () => {
		if (selectedGroup) {
			let unique = selectedGroup.unique;
			const docRef = doc(collection(doc(groupsRef, selectedGroup.unique), 'members'), username);
			await updateDoc(docRef, { rules: rules });
			moveToLoggedIn();
			await selectGroup(unique);
		}
	}
	
	// Display logic
	let textColour = darkMode ? 'white' : 'black';
	let background = darkMode ? 'black' : 'white';
	let boxBack = darkMode ? 'darkgrey' : 'lightgrey';
	let border1 = darkMode ? '1px solid white' : '1px solid black';
	
	const cancel = async () => {
		if (selectedGroup) {
			const unique = selectedGroup.unique;
			moveToLoggedIn();
			await selectGroup(unique);
		}
	}
	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedRole({ ...selectedRole, [event.target.name]: event.target.checked });
	};
	const updateRole = () => {
		const roleArr = [...roles];
		roleArr[roleIndex] = selectedRole;
		setRoles(roleArr);
	}
	const saveRoles = async () => {
		if (selectedGroup) {
			const rolesRef = collection(doc(groupsRef, selectedGroup.unique), 'roles');
			const batch = writeBatch(db);
			roles.forEach((role) => {
				const roleDoc = doc(rolesRef, role.name);
				batch.set(roleDoc, role);
			});
			try {
				await batch.commit();
			} catch (error) {
				console.log(error);
				setErrorMsg("Error occurred saving roles");
			}
			moveToEditGroup();
			await selectGroup(selectedGroup.unique);
		}
	}
	
	//let border2 = darkMode ? 'white' : 'black';
	if (loggedIn) {
		if (isJoining) {
			return (
				<div className="App" style={{ display: 'flex', justifyContent: 'center', backgroundColor: background, color: textColour }}>
					<form onSubmit={handleDisplayUpdate} style={{ display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px', backgroundColor: 'lightskyblue', border: border1 }}>
						<label style={{ fontSize: '16px'}}>Set your displayed name: </label>
						<input type="text" value={groupDisplayName} onChange={e => setGroupDisplayName(e.target.value)} placeholder="Displayed Name" required style={{fontSize: '20px'}}/>
						<label style={{ fontSize: '16px' }}>Hide your username ID from displaying in this group:
							<input type="checkbox" checked={groupHiding} onChange={(e) => setGroupHiding(e.target.checked)} />
						</label>
					</form>
				</div>
			)
		} else if (isElections) {
			return (
				<div className="App" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: background, color: textColour }}>
					<form onSubmit={handleElectionCreate} style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100vh' }}>
						<div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', padding: '50px', boxSizing: 'border-box', borderRight: '1px solid grey' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<button type="button" onClick={() => cancel()} style={{ fontSize: '16px', width: '80px' }}>Cancel</button>
								<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
							</div>
							<p style={{fontSize: '32px', padding: '10px', margin: '0px 150px', borderBottom: border1, textAlign: 'center'}}>Creating New Election</p>
							<label style={{fontSize: '20px', textAlign: 'left', marginTop:'10px'}}>Unique Election ID: </label><input type="text" onChange={e => setElectionUnique(e.target.value)} placeholder="Unique Election Identifier" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: usernameError ? 'red' : 'black' }}/>
							<label style={{fontSize: '20px', textAlign: 'left', marginTop:'10px'}}>Group Title: </label><input type="text" onChange={e => setElectionTitle(e.target.value)} placeholder="Election Title" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: displayNameError ? 'red' : 'black' }}/>
							<span style={{fontSize: '20px', textAlign: 'left', marginTop:'10px'}}>Election Description: </span>
							<textarea style={{ boxSizing: 'border-box', width: '100%', height: '300px', padding: '20px', overflowY: 'auto', borderColor: 'black', fontSize: '16px' }}
									  placeholder="Description of the Election and provides voters with necessary context. Can also describe its use or importance and why it is being held."
									  onChange={(e) => setElectionDescription(e.target.value)} />
							<label style={{ fontSize: '20px', marginTop:'10px' }}> Stop new voters joining the election while it is underway:
								<input type="checkbox" checked={electionPrivate} onChange={(e) => setElectionPrivate(e.target.checked)} />
							</label>
							<button type="submit" style={{ padding: '10px', fontSize: '28px', margin: '20px 150px', boxSizing: 'border-box' }}>Create Election</button>
							{errorMsg && <div style={{ color: 'red', textAlign: 'center', width: '70%' }}>{errorMsg}</div>}
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', padding: '50px', boxSizing: 'border-box' }}>
							<p style={{fontSize: '28px', textAlign: 'center' }}>Election Categories:</p>
							<div style={{ overflow: 'auto', padding: '0px', height: '30vh' }}>
								{categories.map((category, index) => (
									<div key={index} onClick={() => toggleCategory(category)} style={{ border: '1px solid grey', padding: '10px', margin: '10px 100px', backgroundColor: electionCategories.includes(category) ? boxBack : background }}>
										<span style={{ margin: '10px', padding: '10px', fontSize: '24px' }}>{category}</span>
									</div>
								))}
							</div>
							<p style={{fontSize: '28px', textAlign: 'center' }}>Election Options:</p>
							<div style={{ overflow: 'auto', maxHeight: '30vh', padding: '0px' }}>
								{options.map((option, index) => (
									<div key={index}>
										<input
											value={option}
											onChange={event => handleOptionChange(event, index)}
											placeholder={`Option ${index + 1}`}
											style={{ margin: '5px', padding: '5px', fontSize: '16px', width: '500px' }}
										/>
										<button type="button" style={{ margin: '5px', padding: '5px', fontSize: '16px' }} onClick={() => handleDeleteOption(index)}>Delete</button>
									</div>
								))}
							</div>
							<button type="button" style={{ padding: '10px', fontSize: '28px', margin: '10px 200px', boxSizing: 'border-box' }} onClick={handleAddOption}>Add Option</button>
						</div>
					</form>
				</div>
			);
		} else if (isPermissions) {
			return (
				<div className="App" style={{ display: 'flex', flexDirection: 'row', height: '100vh', backgroundColor: background, color: textColour }}>
					<div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '10px', padding: '50px', boxSizing: 'border-box', borderRight: '1px solid grey' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<button type="button" onClick={() => moveToEditGroup()} style={{ fontSize: '16px', width: '80px' }}>Cancel</button>
							<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
						</div>
						<p style={{fontSize: '40px'}}>{groupTitle} Roles</p>
						<div style={{display: 'flex', flexDirection: 'column', margin: '0px', padding: '0px'}}>
							<ul>
								{roles.map((role, index) => (
									<div key={role.name} onClick={() => selectRole(role, index)} style={{ backgroundColor: role.name === selectedRole.name ? boxBack : background, padding: '20px', fontSize: '28px' }}>{role.name}</div>
								))}
							</ul>
						</div>
						<button type="button" onClick={() => saveRoles()} style={{padding: '10px', fontSize: '32px', margin: '0px 250px'}}>Save Changes</button>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', flex: '1', justifyContent: "space-evenly", padding: '50px', boxSizing: 'border-box' }}>
						<p style={{ fontSize: '32px', textAlign: 'center', borderBottom: '1px solid grey', padding: '20px 0px', margin: '0px 200px' }}>Edit Role Permissions</p>
						<div>
							<label htmlFor="canBan" style={{padding: '20px', fontSize: '28px'}}>Can Ban</label>
							<input type="checkbox" id="canBan" name="canBan" checked={selectedRole.canBan} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canDemote" style={{padding: '20px', fontSize: '28px'}}>Can Demote</label>
							<input type="checkbox" id="canDemote" name="canDemote" checked={selectedRole.canDemote} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canPromote" style={{padding: '20px', fontSize: '28px'}}>Can Promote</label>
							<input type="checkbox" id="canPromote" name="canPromote" checked={selectedRole.canPromote} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canKick" style={{padding: '20px', fontSize: '28px'}}>Can Kick</label>
							<input type="checkbox" id="canKick" name="canKick" checked={selectedRole.canKick} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canEditGroup" style={{padding: '20px', fontSize: '28px'}}>Can Edit Group</label>
							<input type="checkbox" id="canEditGroup" name="canEditGroup" checked={selectedRole.canEditGroup} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canEditRoles" style={{padding: '20px', fontSize: '28px'}}>Can Edit Roles</label>
							<input type="checkbox" id="canEditRoles" name="canEditRoles" checked={selectedRole.canEditRoles} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="createElections" style={{padding: '20px', fontSize: '28px'}}>Create Elections</label>
							<input type="checkbox" id="createElections" name="createElections" checked={selectedRole.createElections} onChange={handleChange} />
						</div>
						<button type="button" onClick={() => updateRole()} style={{padding: '10px', fontSize: '32px', margin: '0px 250px'}}>Update Role</button>
					</div>
				</div>
			);
		} else if (isEditing) {
			return (
				<div className="App" style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: background, color: textColour }}>
					<form onSubmit={handleGroupEdit} style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
						<div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', padding: '50px', boxSizing: 'border-box', borderRight: '1px solid grey' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<button type="button" onClick={() => cancel()} style={{ fontSize: '16px', width: '80px' }}>Cancel</button>
								<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
							</div>
							<p style={{fontSize: '32px', padding: '10px', margin: '0px 100px', borderBottom: border1, textAlign: 'center'}}>Editing Group</p>
							<label style={{fontSize: '16px', textAlign: 'left'}}>Group Title: </label><input type="text" value={groupTitle} onChange={e => setGroupTitle(e.target.value)} placeholder="Group Title" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: displayNameError ? 'red' : 'black' }}/>
							<span style={{fontSize: '16px', textAlign: 'left'}}>Group Description: </span>
							<textarea style={{ boxSizing: 'border-box', width: '100%', height: '200px', padding: '15px', overflowY: 'auto', borderColor: 'black', fontSize: '16px' }}
									  value={groupDescription}
									  onChange={(e) => setGroupDescription(e.target.value)} />
							<label style={{ fontSize: '16px' }}> Make the group private by requiring a valid invite code to join:
								<input type="checkbox" checked={groupPrivate} onChange={(e) => setGroupPrivate(e.target.checked)} />
							</label>
							<p style={{fontSize: '20px'}}>Personal Group Details:</p>
							<label style={{fontSize: '16px', textAlign: 'left'}}>Personal Displayed Name: </label><input type="text" value={groupDisplayName} onChange={e => setGroupDisplayName(e.target.value)} placeholder="Your Display Name" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: displayNameError ? 'red' : 'black' }}/>
							<label style={{ fontSize: '16px' }}> Hide your unique ID from group members:
								<input type="checkbox" checked={groupHiding} onChange={(e) => setGroupHiding(e.target.checked)} />
							</label>
							<button type="submit" style={{ padding: '10px', fontSize: '28px', margin: '10px 200px', boxSizing: 'border-box' }}>Save Group Changes</button>
							{errorMsg && <div style={{ color: 'red', textAlign: 'center', width: '70%' }}>{errorMsg}</div>}
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', justifyContent: 'space-evenly', padding: '50px', boxSizing: 'border-box' }}>
							<button type="button" onClick={() => moveToEditPermissions()} style={{ fontSize: '20px', margin:'10px 300px', padding: '10px' }}>Edit Roles and Permissions</button>
							<p style={{fontSize: '32px', textAlign: 'center' }}>Election Categories:</p>
							<div style={{ overflow: 'auto', padding: '0px' }}>
								{categories.map((category, index) => (
									<div key={index}>
										<input
											value={category}
											onChange={event => handleCategoryChange(event, index)}
											placeholder={`Category ${index + 1}`}
											style={{ margin: '10px', padding: '10px', fontSize: '24px', width: '480px' }}
										/>
										<button type="button" style={{ margin: '5px', padding: '5px', fontSize: '20px' }} onClick={() => handleDeleteCategory(index)}>Delete</button>
									</div>
								))}
							</div>
							<button type="button" style={{ padding: '5px', margin: '20px 200px', fontSize: '24px' }} onClick={handleAddCategory}>Add Option</button>
						</div>
					</form>
				</div>
			);
		} else if (isCreating) {
			return (
				<div className="App" style={{ display: 'flex', height: '100vh', backgroundColor: background, color: textColour }}>
					<form onSubmit={handleGroupCreate} style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
						<div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', padding: '50px', boxSizing: 'border-box', borderRight: '1px solid grey' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<button type="button" onClick={() => moveToLoggedIn()} style={{ fontSize: '16px', width: '80px' }}>Cancel</button>
								<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
							</div>
							<p style={{fontSize: '32px', padding: '10px', margin: '0px 100px', borderBottom: border1, textAlign: 'center'}}>Creating New Group</p>
							<label style={{fontSize: '16px', textAlign: 'left'}}>Unique Group ID: </label><input type="text" onChange={e => setGroupUnique(e.target.value)} placeholder="Unique Group Identifier" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: usernameError ? 'red' : 'black' }}/>
							<label style={{fontSize: '16px', textAlign: 'left'}}>Group Title: </label><input type="text" onChange={e => setGroupTitle(e.target.value)} placeholder="Group Title" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: displayNameError ? 'red' : 'black' }}/>
							<span style={{fontSize: '16px', textAlign: 'left'}}>Group Description: </span>
							<textarea style={{ boxSizing: 'border-box', width: '100%', height: '200px', padding: '15px', overflowY: 'auto', borderColor: 'black', fontSize: '16px' }}
									  placeholder="Description of the group and what it is about. This can help members and other users to understand what it will be used for and how things operate in the group."
									  onChange={(e) => setGroupDescription(e.target.value)} />
							<label style={{ fontSize: '16px' }}> Make the group private by requiring a valid invite code to join:
								<input type="checkbox" checked={groupPrivate} onChange={(e) => setGroupPrivate(e.target.checked)} />
							</label>
							<p style={{fontSize: '20px'}}>Personal Group Details:</p>
							<label style={{fontSize: '16px', textAlign: 'left'}}>Personal Displayed Name: </label><input type="text" onChange={e => setGroupDisplayName(e.target.value)} placeholder="Your Display Name" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: displayNameError ? 'red' : 'black' }}/>
							<label style={{ fontSize: '16px' }}> Hide your unique ID from group members:
								<input type="checkbox" checked={groupHiding} onChange={(e) => setGroupHiding(e.target.checked)} />
							</label>
							<button type="submit" style={{ padding: '10px', fontSize: '28px', margin: '10px 200px', boxSizing: 'border-box' }}>Create Group</button>
							{errorMsg && <div style={{ color: 'red', textAlign: 'center', width: '70%' }}>{errorMsg}</div>}
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', justifyContent: 'space-evenly', padding: '50px', boxSizing: 'border-box' }}>
							<p style={{fontSize: '32px', textAlign: 'center' }}>Election Categories:</p>
							<div style={{ overflow: 'auto', padding: '0px' }}>
								{categories.map((category, index) => (
									<div key={index}>
										<input
											value={category}
											onChange={event => handleCategoryChange(event, index)}
											placeholder={`Category ${index + 1}`}
											style={{ margin: '10px', padding: '10px', fontSize: '24px', width: '480px' }}
										/>
										<button type="button" style={{ margin: '5px', padding: '5px', fontSize: '20px' }} onClick={() => handleDeleteCategory(index)}>Delete</button>
									</div>
								))}
							</div>
							<button type="button" style={{ padding: '5px', margin: '20px 200px', fontSize: '24px' }} onClick={handleAddCategory}>Add Option</button>
						</div>
					</form>
				</div>
			);
		} else if (isFinding) {
			return (
				<div className="App" style={{ display: 'flex', margin: '0px', padding: '10px', height: '100vh', width: '100%', boxSizing: 'border-box', backgroundColor: background, color: textColour }}>
					<div style={{ display: 'flex', flex: 1, flexDirection: 'column', height: '100%', borderRight: border1 }}>
						<div style={{display: 'flex', justifyContent: 'space-between', margin: '10px'}}>
							<button type="button" onClick={() => moveToSignIn()}
									style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Sign Out
							</button>
							<button type="button" onClick={() => setDarkMode(!darkMode)}
									style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark
								Mode
							</button>
						</div>
						<div style={{display: 'flex', justifyContent: 'space-evenly', margin: '10px'}}>
							<button type="button" onClick={() => moveToCreateGroup()}
									style={{
										padding: '10px 20px',
										fontSize: '20px',
										margin: '20px',
										boxSizing: 'border-box'
									}}>Create
								Group
							</button>
							<button type="button" onClick={() => moveToLoggedIn()}
									style={{
										padding: '10px 20px',
										fontSize: '20px',
										margin: '20px',
										boxSizing: 'border-box'
									}}>Go Back
							</button>
						</div>
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							margin: '0px',
							padding: '10px',
							borderTop: '1px solid grey',
							overflowY: 'scroll'
						}}>
							{groupIDs.length === 0 ? (
								<p style={{fontSize: '20px', alignSelf: 'center'}}>You are not part of any groups
									yet.<br></br> To
									get started, you can find an existing group to join and get involved with an
									established
									community, or you can found your own group and enable others to partake in the
									discussions that
									matter to you!</p>
							) : (
								<ul>
									{groupIDs.map(group => (
										<div key={group.unique} onClick={() => selectGroup(group.unique)} style={{
											display: 'flex',
											flexDirection: 'column',
											margin: '0px',
											padding: '10px',
											textAlign: 'left',
											borderBottom: '1px solid grey'
										}}>
											<span style={{fontSize: '24px'}}>{group.name}</span>
											<span style={{fontSize: '16px'}}>@{group.unique}</span>
										</div>
									))}
								</ul>
							)}
						</div>
					</div>
					{/* border */}
					
					<div style={{
						display: 'flex',
						flex: 5,
						flexDirection: 'row',
						height: '100%',
						padding: '0px 10px',
						margin: '0px 10px'
					}}>
						<div style={{display: 'flex', flex: 2, flexDirection: 'column'}}>
							<p style={{
								fontSize: '48px',
								padding: '10px',
								margin: '0px 300px',
								borderBottom: border1,
								textAlign: 'center'
							}}>Finding Groups</p>
							<p style={{paddingTop: '20px'}}></p>
							{/*
							<div style={{paddingTop: '10px', margin: '10px'}}>
								<span style={{fontSize: '32px'}}>Search for groups: </span><input type="text" style={{
								fontSize: '32px',
								padding: '10px'
							}} value={searchQuery} onChange={(e) => fetchGroups(e.target.value)}
																								  placeholder="Search..."/>
							</div>
							{/*<p style={{fontSize: '32px', fontStyle: 'italic'}}>Matching Groups:</p>*/}
							<div
								style={{display: 'flex', flexDirection: 'column', margin: '10px', overflowY: 'scroll'}}>
								{matchingGroups.map((group) => (
									<div>
										{selectedGroup?.unique === group.unique ? (
											<div key={group.unique} onClick={() => selectGroup(group.unique)} style={{
												display: 'flex',
												flexDirection: 'column',
												margin: '10px',
												padding: '10px 100px',
												borderTop: '1px solid grey',
												borderBottom: '1px solid grey',
												backgroundColor: boxBack
											}}>
												<span style={{fontSize: '28px'}}>{group.name}</span>
												<span
													style={{fontSize: '20px', textAlign: 'left'}}>@{group.unique}</span>
												<span style={{
													fontSize: '20px',
													textAlign: 'left'
												}}>Members: {memberCount}</span>
												<p style={{
													fontSize: '20px',
													maxLines: '3',
													textOverflow: 'ellipsis'
												}}>{group.description}</p>
											</div>
										) : (
											<div key={group.unique} onClick={() => selectGroup(group.unique)} style={{
												display: 'flex',
												flexDirection: 'column',
												margin: '10px',
												padding: '10px 100px',
												borderTop: '1px solid grey',
												borderBottom: '1px solid grey'
											}}>
												<span style={{fontSize: '28px'}}>{group.name}</span>
												<span
													style={{fontSize: '20px', textAlign: 'left'}}>@{group.unique}</span>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
						<div style={{display: 'flex', flex: 1, flexDirection: 'column', borderLeft: '1px solid gray'}}>
							<p style={{paddingTop: '20px'}}></p>
							<div style={{padding: '10px', margin: '10px'}}>
								{selectedGroup ? (
									<div style={{
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'center',
										textAlign: 'center',
										alignItems: 'center'
									}}>
										<div>
											<strong style={{fontSize: '40px'}}>{selectedGroup.name}</strong>
											<p style={{fontSize: '28px', textAlign: 'left'}}>@{selectedGroup.unique}</p>
											<p style={{fontSize: '28px', textAlign: 'left'}}>Members: {memberCount}</p>
											<p style={{
												fontSize: '24px',
												paddingBottom: '20px',
												borderBottom: '1px solid grey'
											}}>{selectedGroup.description}</p>
											<p></p>
											<label style={{fontSize: '20px'}}>Set your displayed name: </label>
											<input type="text" value={tempDisplayName}
												   onChange={e => setTempDisplayName(e.target.value)}
												   placeholder="Displayed Name" required style={{fontSize: '20px'}}/>
											<p></p>
											<label style={{fontSize: '20px'}}>Hide your username ID in this group:
												<input type="checkbox" checked={groupHiding}
													   onChange={(e) => setGroupHiding(e.target.checked)}/>
											</label>
											<p></p>
											<button type="button" style={{fontSize: '20px', padding: '10px'}}
													onClick={() => handleJoin()}>Join {selectedGroup.name}</button>
										</div>
									</div>
								) : (
									<div style={{display: 'flex', flexDirection: 'column', textAlign: 'center'}}>
										<p style={{fontSize: '20px'}}>click on a group to see more of their details</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			);
		} else if (isRules) {
			if (categories.length === 0) {
				return (
					<div className="App" style={{ display: 'flex', margin: '0px', padding: '0px', height: '100vh', backgroundColor: background, color: textColour }}>
						<div style={{display: 'flex', justifyContent: 'space-between', margin: '10px'}}>
							<button type="button" onClick={() => moveToLoggedIn()} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Go Back</button>
							<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
						</div>
						<p style={{ fontSize: '40px', textAlign: 'center' }}>This group has no categories for elections, categories are needed to be able to use delegation rules in a group!</p>
					</div>
				);
			} else {
				return (
					<div className="App" style={{display: 'flex', margin: '0px', padding: '0px', height: '100vh', backgroundColor: background, color: textColour}}>
						{rules.length === 0 ? (
							<div style={{display: 'flex', flex: 1, flexDirection: 'column', height: '100%', padding: '20px 5px', borderRight: border1}}>
								<div style={{display: 'flex', justifyContent: 'space-evenly', margin: '10px'}}>
									<button type="button" onClick={() => cancelRules()} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Cancel</button>
									<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
								</div>
								<p style={{ fontSize: '40px', textAlign: 'center' }}>You have no delegation rules in place yet, create one to get started!</p>
							</div>
						) : (
							<div style={{display: 'flex', flex: 1, flexDirection: 'column', maxHeight: '100vh', padding: '20px 5px', overflow: 'auto', borderRight: border1, boxSizing: 'border-box' }}>
								<div style={{display: 'flex', justifyContent: 'space-between', margin: '10px 50px'}}>
									<button type="button" onClick={() => cancelRules()} style={{padding: '5px 5px', fontSize: '20px', boxSizing: 'border-box'}}>Cancel</button>
									<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '20px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
								</div>
								<p style={{fontSize: '32px'}}>Delegation Rules</p>
								<DndProvider backend={HTML5Backend}>
									<RuleList rules={rules} setRules={setRules} selectMember={setSelectedMember}/>
								</DndProvider>
								<span style={{ textAlign: 'center', fontSize: '16px' }}>tip: hover over a delegate rule to see the member the rule applies to.</span>
								<button type="button" onClick={() => saveRules()} style={{padding: '10px 10px', fontSize: '24px', margin: '20px 200px', boxSizing: 'border-box'}}>Save Changes</button>
							</div>
						)}
						{/* border */}
						<div style={{display: 'flex', flex: 2, flexDirection: 'row', height: '100%', padding: '0px 10px', margin: '0px 10px'}}>
							<div style={{display: 'flex', flex: 3, flexDirection: 'column', height: '100%', padding: '0px 10px'}}>
								<p style={{fontSize: '40px', borderBottom: '1px solid grey', paddingBottom: '20px', margin: '30px 200px' }}>Create New Rule</p>
								{errorMsg && <div style={{color: 'red', textAlign: 'center', width: '100%'}}>{errorMsg}</div>}
								
								<label style={{ fontSize: '24px', margin: '20px' }}>
									Condition:
									<select style={{ fontSize: '20px', margin: '20px' }} onChange={(e) => setCondition(e.target.value)} value={condition}>
										<option value="" disabled>Select a category</option>
										{categories.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</select>
								</label>
								<label style={{ fontSize: '24px', margin: '20px' }}>
									Action:
									<select style={{ fontSize: '20px', margin: '20px' }} onChange={(e) => setAction(e.target.value as 'delegate' | 'abstain')}
											value={action}>
										<option value="delegate">delegate</option>
										<option value="abstain">abstain</option>
									</select>
								</label>
								<button style={{ fontSize: '24px', margin: '20px 250px', padding: '10px 10px' }} onClick={addRule}>Create Rule</button>
							</div>
							{/* right sidebar */}
							<div style={{display: 'flex', flex: 1, flexDirection: 'column', maxHeight: '100vh', overflow: 'auto', padding: '20px 0px', borderLeft: border1, boxSizing: 'border-box'}}>
								<span style={{fontSize: '24px', textAlign: 'center'}}>Member List: </span>
								<ul>
									{groupMembers.map(member => (
										<div>
											{selectedMember === member.username ? (
												<div key={member.username} onClick={() => selectMember(member.username)}
													 style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px', textAlign: 'left', border: '1px solid grey', backgroundColor: boxBack}}>
													<span
														style={{fontSize: '20px', textAlign: 'left'}}>{member.displayName}</span>
													<span
														style={{fontSize: '12px'}}>{member.hideID ? '' : '@' + member.username}</span>
													<span
														style={{fontSize: '16px', fontStyle: 'italic'}}>{member.role}</span>
												</div>
											) : (
												<div key={member.username} onClick={() => selectMember(member.username)}
													 style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px', textAlign: 'left', border: '1px solid grey', backgroundColor: background}}>
													<span
														style={{fontSize: '20px', textAlign: 'left'}}>{member.displayName}</span>
													<span
														style={{fontSize: '12px'}}>{member.hideID ? '' : '@' + member.username}</span>
													<span
														style={{fontSize: '16px', fontStyle: 'italic'}}>{member.role}</span>
												</div>
											)}
										</div>
									))}
								</ul>
							</div>
						</div>
					</div>
				);
			}
		} else {
			return (
				<div className="App" style={{ display: 'flex', margin: '0px', padding: '0px', height: '100vh', width: '100%', backgroundColor: background, color: textColour }}>
					<div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '10px 0px', maxHeight: '100vh', overflow: 'auto', borderRight: border1 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px' }}>
							<button type="button" onClick={() => moveToSignIn()} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Sign Out</button>
							<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-evenly', margin: '10px' }}>
							<button type="button" onClick={() => moveToCreateGroup()} style={{padding: '10px 20px', fontSize: '20px', margin: '20px', boxSizing: 'border-box'}}>Create Group</button>
							<button type="button" onClick={() => moveToFindGroup()} style={{padding: '10px 20px', fontSize: '20px', margin: '20px', boxSizing: 'border-box'}}>Find Group</button>
						</div>
						<div style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '0px', borderTop: '1px solid grey', overflow: 'auto' }}>
							{groupIDs.length === 0 ? (
								<p style={{fontSize: '20px', alignSelf: 'center'}}>You are not part of any groups yet.<br></br> To
									get started, you can find an existing group to join and get involved with an established
									community, or you can found your own group and enable others to partake in the discussions that
									matter to you!</p>
							) : (
								<ul>
									{groupIDs.map(group => (
										<div key={group.unique} onClick={() => selectGroup(group.unique)} style={{display: 'flex', flexDirection: 'column', margin: '0px', padding: '10px', textAlign: 'left', backgroundColor: group.unique === selectedGroup?.unique ? boxBack : background, borderBottom: '1px solid grey' }}>
											<span style={{ fontSize: '24px' }}>{group.name}</span>
											<span style={{ fontSize: '16px' }}>@{group.unique}</span>
										</div>
									))}
								</ul>
							)}
						</div>
					</div>
					{/* border */}
					{selectedGroup ? (
						<div style={{display: 'flex', flex: 5, flexDirection: 'row', height: '100%', padding: '0px 20px'}}>
							<div style={{display: 'flex', flex: 4, flexDirection: 'column', height: '100%', padding: '0px 10px'}}>
								<div onClick={() => setExpDesc(!expDesc)}>
									<p></p>
									<strong style={{fontSize: '40px'}}>{selectedGroup.name}</strong>
									{expDesc && (<p style={{fontSize: '24px', textOverflow: 'ellipsis'}} >{selectedGroup.description}</p>)}
								</div>
								{/* Room for elections here */}
								<div style={{display: 'flex', flexDirection: 'row', margin: '0px 100px', justifyContent: 'space-between'}}>
									<p style={{fontSize: '28px', textAlign: 'left' }}>Current Elections:</p>
									<button type="button" onClick={() => moveToElections()} style={{padding: '10px 50px', fontSize: '20px', margin: '20px ', boxSizing: 'border-box'}}>Create Election</button>
								</div>
								<div style={{display: 'flex', flexDirection: 'column', margin: '0px', padding: '10px', maxHeight: '100%', borderTop: '1px solid grey', overflow: 'auto' }}>
									{elections.length === 0 ? (
										<p style={{fontSize: '20px', alignSelf: 'center'}}>There are no live elections in this group.<br></br> If you have the permissions to create elections,
											you can use the Create Election button to get started in this group and allow the other members to vote on your proposal!</p>
									) : (
										<ul>
											{elections.map((election) => (
												<div key={election.unique}>
													{selectedElection?.unique === election.unique ? (
														<div style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px 10px', borderTop: '1px solid grey', borderBottom: '1px solid grey', backgroundColor: boxBack }}>
															<span style={{fontSize: '28px' }}>{election.name}</span>
															<span style={{ fontSize: '20px' }}>@{election.unique}</span>
															<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}>
																{election.category.map((name) => (
																	<div style={{ border: border1, padding: '5px', margin: '5px' }}>
																		<span style={{ fontSize: '20px' }}>{name}</span>
																	</div>
																))}
															</div>
															<p style={{fontSize: '20px'}}>{election.description}</p>
															<span style={{ fontSize: '20px' }}>Voting Options:</span>
															<div style={{ display: 'flex', flexDirection: 'column', maxHeight: '300px', overflow: 'auto', padding: '10px', margin: '0px 200px' }}>
																{selectedElection.options.map((option, index) => (
																	<div>
																		{selectedVote === index ? (
																			<div style={{ padding: '10px', fontSize: '20px', borderBottom: '1px solid grey', backgroundColor: background }}>
																				{electionScores ? (
																					<span>{option}  :  {electionScores[index]}%</span>
																				) : (
																					<span>{option}</span>
																				)}
																			</div>
																		) : (
																			<div onClick={() => selectVote(index)} style={{ padding: '10px', fontSize: '20px', borderBottom: '1px solid grey', backgroundColor: boxBack }}>
																				{electionScores ? (
																					<span>{option}  :  {electionScores[index]}%</span>
																				) : (
																					<span>{option}</span>
																				)}
																			</div>
																		)}
																	</div>
																))}
															</div>
															<div style={{ display: 'flex', justifyContent: 'space-evenly', margin: '10px' }}>
																<button type="button" onClick={() => calculateResult()} style={{padding: '5px 5px', fontSize: '18px', boxSizing: 'border-box'}}>Calculate Result</button>
																<button type="button" onClick={() => handleVote()} style={{padding: '5px 5px', fontSize: '18px', boxSizing: 'border-box'}}>Submit Vote</button>
																<button type="button" onClick={() => handleDelegation()} style={{padding: '5px 5px', fontSize: '18px', boxSizing: 'border-box'}}>Delegate Vote</button>
															</div>
															{errorMsg && <div style={{ color: 'red', textAlign: 'center', width: '100%' }}>{errorMsg}</div>}
														</div>
													) : (
														<div onClick={() => selectElection(election.unique)} style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px 10px', borderTop: '1px solid grey', borderBottom: '1px solid grey' }}>
															<span style={{fontSize: '28px' }}>{election.name}</span>
															<span style={{ fontSize: '20px' }}>@{election.unique}</span>
															<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}>
																{election.category.map((name) => (
																	<div style={{ fontSize: '16px', border: border1, padding: '5px', margin: '5px' }}>
																		<span style={{ fontSize: '16px' }}>{name}</span>
																	</div>
																))}
															</div>
														</div>
													)}
												</div>
											))}
										</ul>
									)}
								</div>
							</div>
							{/* right sidebar */}
							<div style={{display: 'flex', flex: 1, flexDirection: 'column', height: '100%', borderLeft: border1 }}>
								<div>
									{!editingDisplay ? (
										<div onClick={() => setEditingDisplay(true)} style={{ display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px', textAlign: 'left', border: '1px solid grey' }}>
											<span style={{fontSize: '22px', textAlign: 'left'}}>{groupDisplayName}</span>
											<span style={{fontSize: '14px'}}>{groupHiding ? '(Hiding username identity)' : '@' + username }</span>
											<span style={{fontSize: '18px', fontStyle: 'italic'}}>{groupRole}</span>
										</div>
									) : (
										<div style={{ display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px', backgroundColor: boxBack, border: border1 }}>
											<label style={{ fontSize: '16px'}}>Set your displayed name: </label>
											<input type="text" value={tempDisplayName} onChange={e => setTempDisplayName(e.target.value)} placeholder="Displayed Name" required style={{fontSize: '20px'}}/>
											<label style={{ fontSize: '16px' }}>Hide your username ID from displaying in this group:
												<input type="checkbox" checked={groupHiding} onChange={(e) => setGroupHiding(e.target.checked)} />
											</label>
											<div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
												<button type="button" onClick={() => setEditingDisplay(false)} style={{padding: '5px', fontSize: '16px', margin: '10px', boxSizing: 'border-box'}}>
													Cancel
												</button>
												<button type="button" onClick={() => handleDisplayUpdate()} style={{padding: '5px', fontSize: '16px', margin: '10px', boxSizing: 'border-box'}}>
													Apply
												</button>
											</div>
										</div>
									)}
								</div>
								<button type="button" onClick={() => moveToEditGroup()} style={{padding: '10px 10px', fontSize: '20px', margin: '10px 40px', boxSizing: 'border-box'}}>Edit Group</button>
								<button type="button" onClick={() => moveToRules()} style={{padding: '10px 10px', fontSize: '20px', margin: '10px 40px', boxSizing: 'border-box'}}>Delegation Rules</button>
								<span style={{ fontSize: '20px', textAlign: 'center'}}>Member List: </span>
								<div style={{ maxHeight: '100%', overflow: 'auto' }}>
									<ul>
										{groupMembers.map(member => (
											<div key={member.username}>
												{selectedMember === member.username ? (
													<div onClick={() => selectMember(member.username)} style={{ display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px', textAlign: 'left', border: '1px solid grey', backgroundColor: boxBack }}>
														<span style={{fontSize: '20px', textAlign: 'left'}}>{member.displayName}</span>
														<span style={{fontSize: '12px'}}>{member.hideID ? '' : '@' + member.username }</span>
														<span style={{fontSize: '16px', fontStyle: 'italic'}}>{member.role}</span>
													</div>
												) : (
													<div onClick={() => selectMember(member.username)} style={{ display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px', textAlign: 'left', border: '1px solid grey', backgroundColor: background }}>
														<span style={{fontSize: '20px', textAlign: 'left'}}>{member.displayName}</span>
														<span style={{fontSize: '12px'}}>{member.hideID ? '' : '@' + member.username }</span>
														<span style={{fontSize: '16px', fontStyle: 'italic'}}>{member.role}</span>
													</div>
												)}
											</div>
										))}
									</ul>
								</div>
							</div>
						</div>
					) : (
						<div style={{ display: 'flex', flex: 5, flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
						<p style={{ textAlign: 'center', fontSize: '40px' }}>Welcome {displayName}!</p>
						</div>
					)}
				</div>
			);
		}
	}
	
	if (isSignUp) {
		return (
			<div className="App" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: background, color: textColour }}>
				<form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '400px' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between'}}>
						<button type="button" onClick={() => moveToSignIn()} style={{ padding: '5px', marginRight: '15px', fontSize: '16px', boxSizing: 'border-box' }}>Back</button>
						<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
					</div>
					{errorMsg && <div style={{ color: 'red', textAlign: 'center', width: '100%' }}>{errorMsg}</div>}
					<p style={{fontSize: '28px', padding: '10px', margin: '0px 50px', borderBottom: border1, backgroundColor: background, color: textColour, textAlign: 'center'}}>Create New Account</p>
					<label style={{fontSize: '16px', textAlign: 'left'}}>Unique Username: </label><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', width: '100%', borderColor: usernameError ? 'red' : 'black' }}/>
					<label style={{fontSize: '16px', textAlign: 'left'}}>Displayed Nickname: </label><input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display Name" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', width: '100%', borderColor: displayNameError ? 'red' : 'black' }}/>
					<label style={{fontSize: '16px', textAlign: 'left'}}>Password: </label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', width: '100%', borderColor: passwordError ? 'red' : 'black' }}/>
					<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', width: '100%', borderColor: confirmPasswordError ? 'red' : 'black' }}/>
					<button type="submit" style={{ padding: '10px', fontSize: '20px', marginTop: '10px', boxSizing: 'border-box' }}>Create Account</button>
				</form>
			</div>
		);
	}
	
	return (
		<div className="App" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: background, color: textColour }}>
			<form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '400px' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between'}}>
					<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', marginRight: '10px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
					{errorMsg && <div style={{ color: 'red', textAlign: 'center'}}>{errorMsg}</div>}
				</div>
				<p style={{fontSize: '32px', padding: '10px', margin: '0px 140px', borderBottom: border1, textAlign: 'center'}}>Sign In</p>
				<label style={{fontSize: '16px', textAlign: 'left'}}>Username: </label><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', width: '100%', borderColor: usernameError ? 'red' : 'black' }}/>
				<label style={{fontSize: '16px', textAlign: 'left'}}>Password: </label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', width: '100%', borderColor: passwordError ? 'red' : 'black' }}/>
				<div style={{ display: 'flex', justifyContent: 'space-between', padding: '0px', margin: '0px', width: '100%' }}>
					<button type="submit" style={{ padding: '10px', fontSize: '20px', width: '45%', boxSizing: 'border-box' }}>Sign In</button>
					<button type="button" onClick={() => moveToSignUp()} style={{ padding: '10px', fontSize: '20px', width: '45%', boxSizing: 'border-box' }}>Sign Up</button>
				</div>
			</form>
		</div>
	);
}

export default App;
