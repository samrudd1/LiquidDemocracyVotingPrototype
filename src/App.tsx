import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, setDoc, doc, getDoc, updateDoc, getCountFromServer, onSnapshot, arrayUnion, arrayRemove, query, where, getDocs, writeBatch } from 'firebase/firestore';
import './App.css';

import crypto from 'crypto';

type MemberData = { username: string, displayName: string, role: string, hideID: boolean };
type GroupPreview = { unique: string, name: string };
type GroupData = { unique: string, name: string, description: string, founder: string, banned: Array<string>, invites: Array<string>, private: boolean };
type RoleData = { name: string, canBan: boolean, canDemote: boolean, canPromote: boolean, canKick: boolean, canEditGroup: boolean, canEditRoles: boolean, createElections: boolean };
type UserData = { name: string, groups: Array<string>, hash: string, salt: string, iterations: number };
type ElectionData = { unique: string, name: string, description: string, creator: string, category: string[], closed: boolean, ended: boolean, options: string[], counts: number[] };
type VoterData = { unique: string, vote: number, delegation: string, weight: number };

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
	const [selectedMember, setSelectedMember] = useState<MemberData>();
	const [selectedGroup, setSelectedGroup] = useState<GroupData>();
	const [selectedElection, setSelectedElection] = useState<ElectionData>();
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
	const [isVoting, setIsVoting] = useState(false);
	
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
		setIsVoting(false);
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
		setIsVoting(false);
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
		setIsVoting(false);
	};
	const moveToCreateGroup = () => {
		clearErrors();
		setIsCreating(true);
		setIsEditing(false);
		setIsFinding(false);
		setIsPermissions(false);
		setIsElections(false);
		setIsVoting(false);
	};
	const moveToEditPermissions = () => {
		clearErrors();
		setIsPermissions(true);
	};
	const moveToFindGroup = () => {
		clearErrors();
		setSelectedGroup(undefined);
		setIsCreating(false);
		setIsEditing(false);
		setIsFinding(true);
		setIsPermissions(false);
		setIsElections(false);
		setIsVoting(false);
	};
	const moveToEditGroup = () => {
		clearErrors();
		setIsCreating(false);
		setIsEditing(true);
		setIsFinding(false);
		setIsPermissions(false);
		setIsElections(false);
		setIsVoting(false);
	};
	const moveToElections = () => {
		clearErrors();
		setLoggedIn(true);
		setIsElections(true);
		setIsCreating(false);
		setIsEditing(false);
		setIsFinding(false);
		setIsPermissions(false);
		setIsVoting(false);
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
		if (data.exists()) {
			setSelectedGroup(data.data() as GroupData);
			//if (selectedGroup) {
			let user = memDoc.data() as MemberData;
			let userRole = user?.role || 'member'; // The ?. is optional chaining in case 'user' is undefined
			let name = user?.displayName || username;
			let hide = user?.hideID || false;
			
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
			
			//below is data for user
			setGroupHiding(hide);
			setGroupDisplayName(name);
			setTempDisplayName(name);
			setGroupRole(userRole);
			setMemberCount(count.data().count);
			setIsGroupSelected(true);
			//}
		} else {
			setErrorMsg("Group data could not be found");
		}
	};
	const selectMember = (member: MemberData) => {
		setSelectedMember(member);
	};
	const selectRole = (role: RoleData) => {
		setSelectedRole(role);
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
		
		const data: GroupData = { unique: groupUnique, name: groupTitle, description: groupDescription, founder: username, banned: [], invites: [], private: groupPrivate };
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
			
		} catch (error) {
			setUsernameError(true);
			setErrorMsg("Group Identifier already exists. Please try a different one");
		}
	};
	
	//for election options
	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
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
					category: [],
					closed: electionPrivate,
					ended: false,
					options: newOptions,
					counts: voteCounter
				};
				await setDoc(docRef, data);
				const batch = writeBatch(db);
				groupMembers.forEach((voter) => {
					const voterDoc = doc(voterRef, voter.username);
					batch.set(voterDoc, { unique: voter.username, vote: 0, delegation: '', weight: 1 });
				});
				try {
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
		
	};
	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedRole({ ...selectedRole, [event.target.name]: event.target.checked });
	};
	const selectElection = async (unique: string) => {
		if (selectedGroup) {
			const groupID: string = selectedGroup.unique;
			const electionDoc = doc(collection(doc(groupsRef, groupID), 'elections'), unique);
			const data = await getDoc(electionDoc);
			if (data.exists()) {
				setSelectedElection(data.data() as ElectionData);
			}
		}
	};
	const handleJoin = async () => {
		if (selectedGroup) {
			const unique = selectedGroup.unique;
			const groupRef = doc(groupsRef, selectedGroup.unique);
			const memRef = collection(groupRef, 'members');
			const docRef = doc(memRef, username);
			const userRef = doc(usersRef, username);
			//const groupSnap = await getDoc(groupRef);
			//const oldGroupData = groupSnap.data() as GroupData;
			
			await setDoc(docRef, { username: username, displayName: tempDisplayName, role: 'member', hideID: groupHiding });
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
	
	
	// Display logic
	let textColour = darkMode ? 'white' : 'black';
	let background = darkMode ? 'black' : 'white';
	let boxBack = darkMode ? 'darkgrey' : 'lightgrey';
	let border1 = darkMode ? '1px solid white' : '1px solid black';
	
	function handleSubmit() {
	
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
					<form onSubmit={handleElectionCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '600px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<button type="button" onClick={() => moveToLoggedIn()} style={{ fontSize: '16px', width: '80px' }}>Cancel</button>
							<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
						</div>
						<p style={{fontSize: '32px', padding: '10px', margin: '0px 100px', borderBottom: border1, textAlign: 'center'}}>Creating New Election</p>
						<label style={{fontSize: '16px', textAlign: 'left'}}>Unique Election ID: </label><input type="text" onChange={e => setElectionUnique(e.target.value)} placeholder="Unique Election Identifier" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: usernameError ? 'red' : 'black' }}/>
						<label style={{fontSize: '16px', textAlign: 'left'}}>Group Title: </label><input type="text" onChange={e => setElectionTitle(e.target.value)} placeholder="Election Title" required style={{ boxSizing: 'border-box', padding: '15px', fontSize: '18px', borderColor: displayNameError ? 'red' : 'black' }}/>
						<span style={{fontSize: '16px', textAlign: 'left'}}>Election Description: </span>
						<textarea style={{ boxSizing: 'border-box', width: '100%', height: '160px', padding: '15px', overflowY: 'auto', borderColor: 'black', fontSize: '16px' }}
								  placeholder="Description of the Election and provides voters with necessary context. Can also describe its use or importance and why it is being held."
								  onChange={(e) => setElectionDescription(e.target.value)} />
						<label style={{ fontSize: '16px' }}> Stop new voters joining the election while it is underway:
							<input type="checkbox" checked={electionPrivate} onChange={(e) => setElectionPrivate(e.target.checked)} />
						</label>
						<p style={{fontSize: '16px', textAlign: 'left' }}>Election Options:</p>
						<div style={{ maxHeight: '200px', overflow: 'auto', padding: '0px' }}>
							{options.map((option, index) => (
								<div key={index}>
									<input
										value={option}
										onChange={event => handleInputChange(event, index)}
										placeholder={`Option ${index + 1}`}
										style={{ margin: '5px', padding: '5px', fontSize: '16px', width: '480px' }}
									/>
									<button type="button" style={{ margin: '5px', padding: '5px', fontSize: '16px' }} onClick={() => handleDeleteOption(index)}>Delete</button>
								</div>
							))}
						</div>
						<button type="button" style={{ margin: '5px', padding: '5px', fontSize: '16px' }} onClick={handleAddOption}>Add Option</button>
						<button type="submit" style={{ padding: '10px', fontSize: '18px', marginTop: '10px', boxSizing: 'border-box' }}>Create Election</button>
						{errorMsg && <div style={{ color: 'red', textAlign: 'center', width: '70%' }}>{errorMsg}</div>}
					</form>
				</div>
			);
		} else if (isPermissions) {
			const defaultRoles = [defaultMember, defaultAdmin, defaultFounder];
			return (
				<div className="App" style={{ display: 'flex', flexDirection: 'row', padding: '5%', height: '100vh', backgroundColor: background, color: textColour }}>
					<div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '10px', width: '600px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<button type="button" onClick={() => moveToLoggedIn()} style={{ fontSize: '16px', width: '80px' }}>Cancel</button>
							<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
						</div>
						<h3>{groupTitle} Roles</h3>
						<div style={{display: 'flex', flexDirection: 'column', margin: '0px', padding: '0px'}}>
							<ul>
								{defaultRoles.map(role => (
									<div key={role.name} onClick={() => selectRole(role)} style={{ backgroundColor: role.name === selectedRole.name ? 'lightgray' : 'white', padding: '20px', fontSize: '24px' }}>{role.name}</div>
								))}
							</ul>
						</div>
					</div>
					<form onSubmit={handleSubmit} style={{display: 'flex', height: '80%', flexDirection: 'column', flex: '1', justifyContent: "space-evenly"}}>
						<div>
							<label htmlFor="canBan" style={{padding: '20px', fontSize: '24px'}}>Can Ban</label>
							<input type="checkbox" id="canBan" name="canBan" checked={selectedRole.canBan} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canDemote">Can Demote</label>
							<input type="checkbox" id="canDemote" name="canDemote" checked={selectedRole.canDemote} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canPromote">Can Promote</label>
							<input type="checkbox" id="canPromote" name="canPromote" checked={selectedRole.canPromote} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canKick">Can Kick</label>
							<input type="checkbox" id="canKick" name="canKick" checked={selectedRole.canKick} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canEditGroup">Can Edit Group</label>
							<input type="checkbox" id="canEditGroup" name="canEditGroup" checked={selectedRole.canEditGroup} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="canEditRoles">Can Edit Roles</label>
							<input type="checkbox" id="canEditRoles" name="canEditRoles" checked={selectedRole.canEditRoles} onChange={handleChange} />
						</div>
						<div>
							<label htmlFor="createElections">Create Elections</label>
							<input type="checkbox" id="createElections" name="createElections" checked={selectedRole.createElections} onChange={handleChange} />
						</div>
						<button type="submit">Update Role</button>
					</form>
				</div>
			);
		} else if (isEditing) {
			return (
				<div className="App" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: background, color: textColour }}>
					<form onSubmit={handleGroupCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '600px' }}>
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
						<button type="submit" style={{ padding: '10px', fontSize: '18px', marginTop: '10px', boxSizing: 'border-box' }}>Create Group</button>
						{errorMsg && <div style={{ color: 'red', textAlign: 'center', width: '70%' }}>{errorMsg}</div>}
					</form>
				</div>
			);
		} else if (isCreating) {
			return (
				<div className="App" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: background, color: textColour }}>
					<form onSubmit={handleGroupCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '600px' }}>
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
						<button type="submit" style={{ padding: '10px', fontSize: '18px', marginTop: '10px', boxSizing: 'border-box' }}>Create Group</button>
						{errorMsg && <div style={{ color: 'red', textAlign: 'center', width: '70%' }}>{errorMsg}</div>}
					</form>
				</div>
			);
		} else if (isFinding) {
			return (
				<div className="App" style={{ display: 'flex', margin: '0px', padding: '10px', height: '100%', width: '100%', backgroundColor: background, color: textColour }}>
					<div style={{ display: 'flex', flex: 1, flexDirection: 'column', height: '100%', borderRight: border1 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px' }}>
							<button type="button" onClick={() => moveToSignIn()} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Sign Out</button>
							<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-evenly', margin: '10px' }}>
							<button type="button" onClick={() => moveToCreateGroup()}
									style={{padding: '10px 20px', fontSize: '20px', margin: '20px', boxSizing: 'border-box'}}>Create
								Group
							</button>
							<button type="button" onClick={() => moveToLoggedIn()}
									style={{padding: '10px 20px', fontSize: '20px', margin: '20px', boxSizing: 'border-box'}}>Go Back</button>
						</div>
						<div style={{display: 'flex', flexDirection: 'column', margin: '0px', padding: '10px', borderTop: '1px solid grey', overflowY: 'scroll' }}>
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
					
					<div style={{display: 'flex', flex: 5, flexDirection: 'row', height: '100%', padding: '0px 10px', margin: '0px 10px'}}>
						<div style={{display: 'flex', flex: 2, flexDirection: 'column'}}>
							<p style={{fontSize: '48px', padding: '10px', margin: '0px 400px', borderBottom: border1, textAlign: 'center'}}>Finding Groups</p>
							<p style={{paddingTop: '20px'}}></p>
							<div style={{paddingTop: '10px', margin: '10px'}}>
								<span style={{fontSize: '32px'}}>Search for groups: </span><input type="text" style={{fontSize: '32px', padding: '10px'}} value={searchQuery} onChange={(e) => fetchGroups(e.target.value)} placeholder="Search..." />
							</div>
							{/*<p style={{fontSize: '32px', fontStyle: 'italic'}}>Matching Groups:</p>*/}
							<div style={{ display: 'flex', flexDirection: 'column', margin: '10px', overflowY: 'scroll' }}>
								{matchingGroups.map((group) => (
									<div>
										{selectedGroup?.unique === group.unique ? (
											<div key={group.unique} onClick={() => selectGroup(group.unique)} style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px 100px', borderTop: '1px solid grey', borderBottom: '1px solid grey', backgroundColor: boxBack }}>
												<span style={{fontSize: '28px' }}>{group.name}</span>
												<span style={{ fontSize: '20px', textAlign: 'left' }}>@{group.unique}</span>
												<span style={{fontSize: '20px', textAlign: 'left' }}>Members: {memberCount}</span>
												<p style={{fontSize: '20px', maxLines: '3', textOverflow: 'ellipsis'}}>{group.description}</p>
											</div>
										) : (
											<div key={group.unique} onClick={() => selectGroup(group.unique)} style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px 100px', borderTop: '1px solid grey', borderBottom: '1px solid grey' }}>
												<span style={{fontSize: '28px' }}>{group.name}</span>
												<span style={{ fontSize: '20px', textAlign: 'left' }}>@{group.unique}</span>
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
									<div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', alignItems: 'center'}}>
										<div>
											<strong style={{ fontSize: '40px' }}>{selectedGroup.name}</strong>
											<p style={{ fontSize: '28px', textAlign: 'left' }}>@{selectedGroup.unique}</p>
											<p style={{fontSize: '28px', textAlign: 'left' }}>Members: {memberCount}</p>
											<p style={{fontSize: '28px', paddingBottom: '20px', borderBottom: '1px solid grey'}}>{selectedGroup.description}</p>
											<p></p>
											<label style={{ fontSize: '20px'}}>Set your displayed name: </label>
											<input type="text" value={tempDisplayName} onChange={e => setTempDisplayName(e.target.value)} placeholder="Displayed Name" required style={{fontSize: '20px'}}/>
											<p></p>
											<label style={{ fontSize: '20px' }}>Hide your username ID in this group:
												<input type="checkbox" checked={groupHiding} onChange={(e) => setGroupHiding(e.target.checked)} />
											</label>
											<p></p>
											<button type="button" style={{fontSize: '20px', padding: '10px'}} onClick={() => handleJoin()}>Join {selectedGroup.name}</button>
										</div>
									</div>
								) : (
									<div style={{display: 'flex', flexDirection: 'column', textAlign: 'center'}}>
										<p style={{fontSize: '20px' }}>click on a group to see more of their details</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			);
			
		} else {
			return (
				<div className="App" style={{ display: 'flex', margin: '0px', padding: '10px', height: '100%', width: '100%', backgroundColor: background, color: textColour }}>
					<div style={{ display: 'flex', flex: 1, flexDirection: 'column', height: '100%', borderRight: border1 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px' }}>
							<button type="button" onClick={() => moveToSignIn()} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Sign Out</button>
							<button type="button" onClick={() => setDarkMode(!darkMode)} style={{padding: '5px 5px', fontSize: '16px', boxSizing: 'border-box'}}>Toggle Dark Mode</button>
						</div>
						<div style={{ display: 'flex', justifyContent: 'space-evenly', margin: '10px' }}>
							<button type="button" onClick={() => moveToCreateGroup()}
									style={{padding: '10px 20px', fontSize: '20px', margin: '20px', boxSizing: 'border-box'}}>Create
								Group
							</button>
							<button type="button" onClick={() => moveToFindGroup()}
									style={{padding: '10px 20px', fontSize: '20px', margin: '20px', boxSizing: 'border-box'}}>Find
								Group
							</button>
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
						<div style={{display: 'flex', flex: 5, flexDirection: 'row', height: '100%', padding: '0px 10px', margin: '0px 10px'}}>
							<div style={{display: 'flex', flex: 4, flexDirection: 'column', justifyContent: 'space-evenly', height: '100%', padding: '0px 10px'}}>
								<strong style={{fontSize: '40px'}}>{selectedGroup.name}</strong>
								<p onClick={() => setExpDesc(!expDesc)} style={{fontSize: '24px', textOverflow: 'ellipsis', height: expDesc ? 'auto' : '100px', overflow: expDesc ? 'auto' : 'hidden' }} >{selectedGroup.description}</p>
								{/* Room for elections here */}
								<p style={{fontSize: '24px', textAlign: 'left' }}>Current Elections:</p>
								<button type="button" onClick={() => moveToElections()}
										style={{padding: '10px 20px', fontSize: '20px', margin: '20px', boxSizing: 'border-box'}}>Create Election</button>
								<div style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '0px', borderTop: '1px solid grey', overflow: 'auto' }}>
									{elections.length === 0 ? (
										<p style={{fontSize: '20px', alignSelf: 'center'}}>There are no live elections in this group.<br></br> If you have the permissions to create elections,
											you can use the Create Election button to get started in this group and allow the other members to vote on your proposal!</p>
									) : (
										<ul>
											{elections.map((election) => (
												<div>
													{selectedElection?.unique === election.unique ? (
														<div key={election.unique} onClick={() => selectElection(election.unique)} style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px 10px', borderTop: '1px solid grey', borderBottom: '1px solid grey', backgroundColor: boxBack }}>
															<span style={{fontSize: '28px' }}>{election.name}</span>
															<span style={{ fontSize: '20px' }}>@{election.unique}</span>
															<p style={{fontSize: '20px'}}>{election.description}</p>
															<span style={{ fontSize: '20px' }}>Voting Options:</span>
															<div style={{ display: 'flex', flexDirection: 'column', maxHeight: '200px', overflow: 'auto', padding: '10px', margin: '0px 200px' }}>
																{selectedElection.options.map((option) => (
																	<div style={{ padding: '10px', fontSize: '16px', borderBottom: '1px solid grey' }}>
																		<span>{option}</span>
																	</div>
																))}
															</div>
														</div>
													) : (
														<div key={election.unique} onClick={() => selectElection(election.unique)} style={{display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px 10px', borderTop: '1px solid grey', borderBottom: '1px solid grey' }}>
															<span style={{fontSize: '28px' }}>{election.name}</span>
															<span style={{ fontSize: '20px' }}>@{election.unique}</span>
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
								<span style={{ fontSize: '20px', textAlign: 'center'}}>Member List: </span>
								<ul>
									{groupMembers.map(member => (
										<div key={member.username} onClick={() => selectMember(member)} style={{ display: 'flex', flexDirection: 'column', margin: '10px', padding: '10px', textAlign: 'left', border: '1px solid grey' }}>
											<span style={{fontSize: '20px', textAlign: 'left'}}>{member.displayName}</span>
											<span style={{fontSize: '12px'}}>{member.hideID ? '' : '@' + member.username }</span>
											<span style={{fontSize: '16px', fontStyle: 'italic'}}>{member.role}</span>
										</div>
									))}
								</ul>
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
