document.addEventListener('DOMContentLoaded', function() {

    // ============================
    // 1. CONFIGURATION & CONSTANTS
    // ============================
    // Replaced fixed constant with dynamic function
    function getMaxSlots() {
        return parseInt(localStorage.getItem('uep_max_slots')) || 10;
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const phHolidays = ["0-1", "1-25", "3-9", "4-1", "5-12", "7-21", "7-26", "10-1", "10-2", "10-30", "11-8", "11-24", "11-25", "11-30", "11-31"];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    // --- INITIALIZE DATA ---
    
    // 1. Admin Credentials
    if (!localStorage.getItem('uep_admin_creds')) {
        localStorage.setItem('uep_admin_creds', JSON.stringify({ user: 'admin', pass: 'admin123' }));
    }

    // 2. Dynamic Time Slots
    const defaultSlots = [
        "8:00AM - 9:00AM",
        "10:00AM - 11:00AM",
        "1:00PM - 2:00PM",
        "3:00PM - 5:00PM"
    ];
    
    if (!localStorage.getItem('uep_time_slots')) {
        localStorage.setItem('uep_time_slots', JSON.stringify(defaultSlots));
    }

    // ============================
    // 2. HELPER FUNCTIONS
    // ============================
    function getSessionUser() {
        const u = localStorage.getItem('uep_current_session_user');
        if(u === 'ADMIN_ACCESS') return 'ADMIN'; 
        const users = JSON.parse(localStorage.getItem('uep_all_users')) || {};
        return users[u];
    }

    function formatTextDate(dateStr) {
        if (!dateStr || dateStr === "No Birthday" || dateStr === "Update Required") return "Update Required";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    function getSlotCounts() {
        return JSON.parse(localStorage.getItem('uep_slot_counts')) || {};
    }

    function getTimeSlots() {
        return JSON.parse(localStorage.getItem('uep_time_slots')) || [];
    }

    // ============================
    // 3. STATS INITIALIZATION
    // ============================
    let stats = JSON.parse(localStorage.getItem('uep_clinic_stats')) || {
        pending: 0,
        todayCount: 0,
        allTime: 0,
        lastDate: todayString
    };
    
    if (stats.lastDate !== todayString) {
        stats.todayCount = 0;
        stats.lastDate = todayString;
        localStorage.setItem('uep_clinic_stats', JSON.stringify(stats));
    }

    const statPending = document.getElementById('statPending');
    if (statPending) {
        statPending.innerText = stats.pending;
        document.getElementById('statToday').innerText = stats.todayCount;
        document.getElementById('statAllTime').innerText = stats.allTime.toLocaleString();
    }

    // ============================
    // 4. AUTHENTICATION
    // ============================
    const profileLogout = document.getElementById('logoutBtn');
    if (profileLogout) {
        profileLogout.addEventListener('click', () => {
            localStorage.removeItem('uep_current_session_user');
            window.location.href = 'login.html';
        });
    }
    const adminLogout = document.getElementById('adminLogoutBtn');
    if (adminLogout) {
        adminLogout.addEventListener('click', () => {
            localStorage.removeItem('uep_current_session_user');
            window.location.href = 'login.html';
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const current = localStorage.getItem('uep_current_session_user');
        if (current === 'ADMIN_ACCESS') {
            window.location.href = 'admin.html';
        } else if (current) {
            window.location.href = 'home.html';
        }

        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const u = document.getElementById('loginUsername').value.trim();
            const p = document.getElementById('loginPassword').value.trim();
            
            const adminCreds = JSON.parse(localStorage.getItem('uep_admin_creds'));
            
            if (u === adminCreds.user && p === adminCreds.pass) {
                localStorage.setItem('uep_current_session_user', 'ADMIN_ACCESS');
                window.location.href = 'admin.html';
                return;
            }

            const allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
            if (allUsers[u] && allUsers[u].password === p) {
                localStorage.setItem('uep_current_session_user', u);
                window.location.href = 'home.html';
            } else {
                alert("Invalid Credentials");
            }
        });
    }

    // ============================
    // 5. REGISTRATION LOGIC
    // ============================
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const fName = document.getElementById('regFName').value.trim();
            const mName = document.getElementById('regMName').value.trim();
            const lName = document.getElementById('regLName').value.trim();
            const suffix = document.getElementById('regSuffix').value.trim();
            const sexVal = document.getElementById('regSex').value;

            let fullName = `${fName} ${mName} ${lName}`;
            if (suffix) fullName += ` ${suffix}`;

            const u = document.getElementById('regUsername').value.trim();
            const p = document.getElementById('regPassword').value.trim();
            const id = document.getElementById('regID').value.trim();

            if (id.length !== 6) { alert("School ID must be exactly 6 digits."); return; }

            let allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
            if (allUsers[u]) { alert("Username taken"); return; }

            allUsers[u] = {
                username: u, password: p, firstName: fName, middleName: mName, lastName: lName,
                suffix: suffix, fullName: fullName, id: id, sex: sexVal, course: "Not Set", 
                address: "", birthday: "No Birthday", email: "", initials: fName.charAt(0).toUpperCase(),
                date: null, time: null, reason: "", 
                history: [] 
            };

            localStorage.setItem('uep_all_users', JSON.stringify(allUsers));
            regForm.reset(); 
            alert("Account Created! Please login.");
            window.location.href = 'login.html';
        });
    }

    // ============================
    // 6. BOOKING LOGIC (DYNAMIC SLOTS)
    // ============================
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        const currentUser = getSessionUser();
        if (currentUser && currentUser !== 'ADMIN') {
            const fNameInput = document.getElementById('firstName');
            const mNameInput = document.getElementById('middleName');
            const lNameInput = document.getElementById('lastName');
            const sIDInput = document.getElementById('studentID');

            if (fNameInput) {
                let displayFirst = currentUser.firstName;
                if (currentUser.suffix) displayFirst += " " + currentUser.suffix;
                fNameInput.value = displayFirst || currentUser.fullName;
                fNameInput.readOnly = true;
            }
            if (mNameInput) { mNameInput.value = currentUser.middleName || ""; mNameInput.readOnly = true; }
            if (lNameInput) { lNameInput.value = currentUser.lastName || ""; lNameInput.readOnly = true; }
            if (sIDInput) { sIDInput.value = currentUser.id; sIDInput.readOnly = true; }
        }

        const reasonSelect = document.getElementById('reason');
        const otherReasonInput = document.getElementById('otherReason');
        if (reasonSelect && otherReasonInput) {
            reasonSelect.addEventListener('change', function() {
                if (this.value === "Other") {
                    otherReasonInput.style.display = "block";
                    otherReasonInput.focus();
                } else {
                    otherReasonInput.style.display = "none";
                    otherReasonInput.value = "";
                }
            });
        }

        let selectedDateText = "";
        let selectedTimeText = "";
        
        function initCalendar() {
            const calendarGrid = document.getElementById('calendarGrid');
            const monthLabel = document.getElementById('currentMonthYear');
            const prevBtn = document.getElementById('prevMonth');
            const nextBtn = document.getElementById('nextMonth');
            let currentViewDate = new Date();

            const isSystemLocked = localStorage.getItem('uep_system_locked') === 'true';

            function render(date) {
                calendarGrid.innerHTML = '';
                const year = date.getFullYear();
                const month = date.getMonth();
                if (monthLabel) monthLabel.innerText = `${monthNames[month]} ${year}`;

                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDayIndex = new Date(year, month, 1).getDay();
                
                const lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                const thresholdDate = new Date(lastDayOfCurrentMonth);
                thresholdDate.setDate(lastDayOfCurrentMonth.getDate() - 2);
                let maxAllowedBookingDate;
                if (today >= thresholdDate) {
                    maxAllowedBookingDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
                } else {
                    maxAllowedBookingDate = lastDayOfCurrentMonth;
                }

                for (let x = firstDayIndex; x > 0; x--) {
                    const spacer = document.createElement('div');
                    spacer.style.visibility = "hidden";
                    calendarGrid.appendChild(spacer);
                }

                for (let i = 1; i <= daysInMonth; i++) {
                    let day = document.createElement('div');
                    day.className = 'calendar-day';
                    day.innerText = i;
                    
                    if (isSystemLocked) {
                        day.classList.add('disabled');
                        day.style.backgroundColor = "#ffebeb"; 
                        day.title = "Booking System is currently disabled by Admin.";
                    } else {
                        const checkDate = new Date(year, month, i);
                        checkDate.setHours(0, 0, 0, 0);

                        let isDisabled = checkDate < today || checkDate.getDay() === 0 || checkDate.getDay() === 6;
                        const holidayKey = `${checkDate.getMonth()}-${checkDate.getDate()}`;
                        if (phHolidays.includes(holidayKey)) isDisabled = true;
                        if (checkDate > maxAllowedBookingDate) isDisabled = true;

                        if (isDisabled) {
                            day.classList.add('disabled');
                        } else {
                            day.onclick = function() {
                                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                                this.classList.add('selected');
                                selectedDateText = `${monthNames[month]} ${i}, ${year}`;
                                
                                document.getElementById('selectedDateDisplay').innerText = selectedDateText;
                                document.getElementById('slotStatusDisplay').style.display = 'none';
                                selectedTimeText = "";
                                
                                renderTimeButtons(selectedDateText);
                            };
                        }
                    }
                    calendarGrid.appendChild(day);
                }

                if(isSystemLocked) {
                    document.getElementById('selectedDateDisplay').innerText = "SYSTEM DISABLED BY ADMIN";
                    document.getElementById('selectedDateDisplay').style.color = "red";
                }
            }
            render(currentViewDate);
            prevBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); render(currentViewDate); };
            nextBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); render(currentViewDate); };
        }

        // Updated Function to render buttons dynamically using getMaxSlots()
        function renderTimeButtons(dateKey) {
            const container = document.querySelector('.time-selection-grid');
            container.innerHTML = ""; 

            const slots = getTimeSlots(); 
            const counts = getSlotCounts();
            const dateData = counts[dateKey] || {};

            if(slots.length === 0) {
                container.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:red;'>No slots available.</p>";
                return;
            }

            // Get the current dynamic limit
            const currentLimit = getMaxSlots();

            slots.forEach(timeSlot => {
                const current = dateData[timeSlot] || 0;
                
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'time-btn';
                btn.setAttribute('data-time', timeSlot);
                
                const label = document.createElement('span');
                label.innerText = timeSlot;
                
                const countSpan = document.createElement('span');
                countSpan.className = 'btn-count-text';
                // Display current/limit
                countSpan.innerText = `${current}/${currentLimit} slots`;

                btn.appendChild(label);
                btn.appendChild(countSpan);

                // Use dynamic limit for disabling
                if (current >= currentLimit) {
                    btn.disabled = true;
                    btn.style.backgroundColor = "#ccc";
                }

                btn.addEventListener('click', function() {
                    if (this.disabled) return;
                    
                    const displayedDate = document.getElementById('selectedDateDisplay').innerText;
                    if (!selectedDateText && (displayedDate === "None" || displayedDate === "")) { 
                        alert("Please select a date first."); return; 
                    }
                    if(!selectedDateText && displayedDate !== "None") selectedDateText = displayedDate;

                    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedTimeText = timeSlot;
                    
                    // Use dynamic limit for percentage
                    const pct = (current / currentLimit) * 100;
                    document.getElementById('slotStatusDisplay').style.display = 'block';
                    document.getElementById('statusTextContent').innerText = `${current} / ${currentLimit} Slots Taken (${Math.round(pct)}%)`;
                    document.getElementById('progressBarFill').style.width = `${pct}%`;
                });

                container.appendChild(btn);
            });
        }
        
        initCalendar();

        document.getElementById('confirmBtn').addEventListener('click', function() {
            if (localStorage.getItem('uep_system_locked') === 'true') {
                alert("The booking system is currently disabled by the Admin.");
                return;
            }

            let reasonVal = document.getElementById('reason').value.trim();
            const otherVal = document.getElementById('otherReason').value.trim();
            if (!reasonVal) { alert("Please select a reason."); return; }
            if (reasonVal === "Other") {
                if (!otherVal) { alert("Please specify reason."); document.getElementById('otherReason').focus(); return; }
                reasonVal = `Other: ${otherVal}`;
            }
            if (!selectedDateText || !selectedTimeText) { alert("Please select Date and Time."); return; }

            let counts = getSlotCounts();
            if (!counts[selectedDateText]) counts[selectedDateText] = {};
            if (!counts[selectedDateText][selectedTimeText]) counts[selectedDateText][selectedTimeText] = 0;
            
            // Check against dynamic limit
            if (counts[selectedDateText][selectedTimeText] >= getMaxSlots()) { 
                alert("Slot Full."); 
                return; 
            }

            counts[selectedDateText][selectedTimeText]++;
            localStorage.setItem('uep_slot_counts', JSON.stringify(counts));

            let allUsers = JSON.parse(localStorage.getItem('uep_all_users'));
            let sUser = localStorage.getItem('uep_current_session_user');
            allUsers[sUser].date = selectedDateText;
            allUsers[sUser].time = selectedTimeText;
            allUsers[sUser].reason = reasonVal;
            localStorage.setItem('uep_all_users', JSON.stringify(allUsers));

            stats.pending++;
            stats.allTime++;
            if (selectedDateText === todayString) stats.todayCount++;
            localStorage.setItem('uep_clinic_stats', JSON.stringify(stats));

            alert("Appointment Set!");
            window.location.href = 'profile.html';
        });
    }

    // ============================
    // 7. PROFILE PAGE LOGIC
    // ============================
    const dispName = document.getElementById('dispName');
    if (dispName) {
        const sessionUser = localStorage.getItem('uep_current_session_user');
        if (!sessionUser) { window.location.href = 'login.html'; return; }
        
        let allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
        let user = allUsers[sessionUser];

        if (user) {
            document.getElementById('dispName').innerText = user.fullName;
            document.getElementById('dispID').innerText = user.id;
            document.querySelector('.profile-avatar').innerText = user.initials;
            document.getElementById('dispEmail').innerText = user.email || "---";
            document.getElementById('dispCourse').innerText = user.course || "---";
            document.getElementById('dispSex').innerText = user.sex || "---";

            const addr = user.address && user.address !== "" ? user.address : "Update Required";
            const bdayRaw = user.birthday && user.birthday !== "" && user.birthday !== "No Birthday" ? user.birthday : "Update Required";
            document.getElementById('dispAddress').innerText = addr;
            document.getElementById('dispBirthday').innerText = formatTextDate(bdayRaw);
            
            if (addr === "Update Required") document.getElementById('dispAddress').style.color = "red";
            if (bdayRaw === "Update Required") document.getElementById('dispBirthday').style.color = "red";

            if (user.date) {
                document.getElementById('dispDate').innerText = `${user.date} @ ${user.time}`;
                document.getElementById('dispReason').innerText = user.reason;
            } else {
                document.getElementById('dispDate').innerText = "No Appointment";
            }

            const historyContainer = document.getElementById('recentVisitsContainer');
            if (historyContainer) {
                if (user.history && user.history.length > 0) {
                    historyContainer.innerHTML = "";
                    const reversedHistory = [...user.history].reverse();
                    
                    reversedHistory.forEach(visit => {
                        let detailsBlock = "";
                        if (visit.diagnosis || visit.recommendation) {
                            let diagHtml = visit.diagnosis ? `<div class="detail-line"><span class="detail-label">Diagnosis:</span><span class="detail-text">${visit.diagnosis}</span></div>` : "";
                            let recHtml = visit.recommendation ? `<div class="detail-line"><span class="detail-label">Treatment:</span><span class="detail-text">${visit.recommendation}</span></div>` : "";
                            detailsBlock = `<div class="visit-details">${diagHtml}${recHtml}</div>`;
                        }

                        historyContainer.innerHTML += `
                            <div class="visit-row">
                                <div class="visit-date-box"><i class="far fa-calendar-alt"></i> ${visit.date}</div>
                                <div class="visit-info-box"><span class="visit-reason">${visit.reason}</span>${detailsBlock}</div>
                                <div class="visit-status"><span class="status-pill">Completed</span></div>
                            </div>`;
                    });
                } else if (user.date) {
                    historyContainer.innerHTML = `
                        <div class="visit-row">
                            <div class="visit-date-box">${user.date}</div>
                            <div class="visit-info-box"><span class="visit-reason">${user.reason}</span></div>
                            <div class="visit-status"><span class="status-pill" style="background:var(--uep-orange); color:black;">Upcoming</span></div>
                        </div>`;
                } else {
                    historyContainer.innerHTML = `<p style="text-align:center; opacity:0.7; font-style:italic; padding:20px;">No recent clinic visits recorded.</p>`;
                }
            }
        }

        const editBtn = document.getElementById('editProfileBtn');
        const modal = document.getElementById('editModal');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const editForm = document.getElementById('editForm');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                document.getElementById('editName').value = user.fullName;
                document.getElementById('editID').value = user.id;
                document.getElementById('editCourse').value = user.course;
                document.getElementById('editEmail').value = user.email;
                document.getElementById('editAddress').value = user.address;
                document.getElementById('editBirthday').value = (user.birthday === "No Birthday") ? "" : user.birthday;
                document.getElementById('editSex').value = user.sex || "Male";
                modal.classList.add('active');
            });
            cancelBtn.addEventListener('click', () => { modal.classList.remove('active'); });
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                user.email = document.getElementById('editEmail').value;
                user.course = document.getElementById('editCourse').value;
                user.address = document.getElementById('editAddress').value;
                user.birthday = document.getElementById('editBirthday').value;
                user.sex = document.getElementById('editSex').value;
                allUsers[sessionUser] = user;
                localStorage.setItem('uep_all_users', JSON.stringify(allUsers));
                alert("Profile Updated!");
                location.reload();
            });
        }
    }

    // ============================
    // 8. ADMIN DASHBOARD LOGIC (Updated for Schedule Management)
    // ============================
    const adminAppList = document.getElementById('adminAppointmentList');
    if (adminAppList) {
        if (localStorage.getItem('uep_current_session_user') !== 'ADMIN_ACCESS') {
            window.location.href = 'login.html';
            return;
        }

        const allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
        const studentListBody = document.getElementById('adminStudentList');
        adminAppList.innerHTML = "";
        studentListBody.innerHTML = "";
        let hasAppointment = false;

        let currentPatientUsername = null;
        const diagModal = document.getElementById('diagnosisModal');
        const diagInput = document.getElementById('diagInput');
        const diagRecInput = document.getElementById('diagRecInput');
        const diagForm = document.getElementById('diagnosisForm');
        const cancelDiag = document.getElementById('cancelDiagBtn');
        if(cancelDiag) cancelDiag.addEventListener('click', () => { diagModal.classList.remove('active'); });

        Object.keys(allUsers).forEach(username => {
            const user = allUsers[username];
            if (user.date) {
                hasAppointment = true;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Student Name">${user.fullName}</td>
                    <td data-label="Student ID">${user.id}</td>
                    <td data-label="Course">${user.course || 'N/A'}</td>
                    <td data-label="Date">${user.date}</td>
                    <td data-label="Time">${user.time}</td>
                    <td data-label="Reason">${user.reason}</td>
                    <td data-label="Action"><button class="mark-done-btn" data-user="${username}">Complete</button></td>
                `;
                adminAppList.appendChild(row);
            }
            const rowS = document.createElement('tr');
            rowS.innerHTML = `
                <td data-label="Name">${user.fullName}</td>
                <td data-label="ID Number">${user.id}</td>
                <td data-label="Sex">${user.sex}</td>
                <td data-label="Status" style="color:${user.date ? 'green' : 'grey'}; font-weight:bold;">${user.date ? 'Active' : 'Idle'}</td>
                <td data-label="History"><button class="view-history-btn" data-user="${username}" style="background-color:var(--uep-blue); color:white; border:none; padding:5px 10px; border-radius:4px;">View History</button></td>
            `;
            studentListBody.appendChild(rowS);
        });

        if (!hasAppointment) {
            adminAppList.innerHTML = `<tr><td colspan="7">No active appointments found.</td></tr>`;
        }

        document.querySelectorAll('.mark-done-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                currentPatientUsername = this.getAttribute('data-user');
                const user = allUsers[currentPatientUsername];
                document.getElementById('diagPatientName').innerText = user.fullName;
                
                const isCert = user.reason.toLowerCase().includes('certificate');
                diagInput.value = ""; diagRecInput.value = "";
                
                if (isCert) {
                    document.getElementById('modalTitleText').innerText = "Issue Certificate / Clearance";
                    document.getElementById('lblDiagnosis').innerText = "Clearance Findings / Remarks";
                    diagInput.placeholder = "e.g. Physically Fit";
                    document.getElementById('lblRecommendation').innerText = "Action Taken";
                    diagRecInput.value = "Issued Medical/Dental Certificate";
                } else {
                    document.getElementById('modalTitleText').innerText = "Complete Appointment";
                    document.getElementById('lblDiagnosis').innerText = "Doctor's Diagnosis / Findings";
                    diagInput.placeholder = "e.g. Common Cold";
                    document.getElementById('lblRecommendation').innerText = "Recommendation / Prescription";
                    diagRecInput.placeholder = "e.g. Prescribed meds";
                }
                diagModal.classList.add('active');
            });
        });

        if(diagForm) {
            diagForm.addEventListener('submit', function(e) {
                e.preventDefault();
                if(!currentPatientUsername) return;
                const uData = allUsers[currentPatientUsername];
                
                if (!uData.history) uData.history = [];
                uData.history.push({
                    date: uData.date,
                    time: uData.time,
                    reason: uData.reason,
                    diagnosis: diagInput.value.trim(),
                    recommendation: diagRecInput.value.trim(), 
                    status: "Completed"
                });

                let counts = getSlotCounts();
                if (counts[uData.date] && counts[uData.date][uData.time] > 0) {
                    counts[uData.date][uData.time]--;
                    localStorage.setItem('uep_slot_counts', JSON.stringify(counts));
                }

                uData.date = null; uData.time = null; uData.reason = "";
                allUsers[currentPatientUsername] = uData;
                localStorage.setItem('uep_all_users', JSON.stringify(allUsers));
                
                stats.pending--;
                localStorage.setItem('uep_clinic_stats', JSON.stringify(stats));
                alert("Saved!");
                location.reload();
            });
        }

        const historyModal = document.getElementById('medicalRecordsModal');
        const historyBody = document.getElementById('recordHistoryBody');
        const closeHistory = document.getElementById('closeRecordsModal');
        if (closeHistory) closeHistory.addEventListener('click', () => historyModal.classList.remove('active'));

        document.querySelectorAll('.view-history-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const uName = this.getAttribute('data-user');
                const uData = allUsers[uName];
                document.getElementById('recordStudentName').innerText = uData.fullName;
                document.getElementById('recordStudentID').innerText = uData.id;
                historyBody.innerHTML = "";
                if (uData.history && uData.history.length > 0) {
                    [...uData.history].reverse().forEach(h => {
                        historyBody.innerHTML += `<tr><td data-label="Date">${h.date}</td><td data-label="Reason">${h.reason}</td><td data-label="Diagnosis"><strong>${h.diagnosis}</strong></td><td data-label="Treatment">${h.recommendation}</td></tr>`;
                    });
                } else {
                    historyBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No past records.</td></tr>`;
                }
                historyModal.classList.add('active');
            });
        });

        // --- ADMIN SETTINGS & SCHEDULE MANAGEMENT ---
        const settingsBtn = document.getElementById('adminSettingsBtn');
        const settingsModal = document.getElementById('adminSettingsModal');
        const cancelSettings = document.getElementById('cancelAdminSettings');
        const settingsForm = document.getElementById('adminSettingsForm');
        
        const toggleBooking = document.getElementById('toggleBookingSystem');
        const btnExportCSV = document.getElementById('btnExportCSV');
        const btnClear = document.getElementById('btnClearData');
        const scheduleListContainer = document.getElementById('scheduleList');
        const newSlotInput = document.getElementById('newSlotInput');
        const btnAddSlot = document.getElementById('btnAddSlot');

        function renderAdminScheduleList() {
            if(!scheduleListContainer) return;
            const slots = getTimeSlots();
            scheduleListContainer.innerHTML = "";
            
            if(slots.length === 0) {
                scheduleListContainer.innerHTML = "<p style='color:red; font-size:12px;'>No time slots defined. Students cannot book.</p>";
            } else {
                slots.forEach((slot, index) => {
                    const li = document.createElement('div');
                    li.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px; margin-bottom:5px; border:1px solid #ddd; border-radius:4px;";
                    li.innerHTML = `
                        <span style="font-weight:bold; color:#333;">${slot}</span>
                        <button type="button" class="delete-slot-btn" data-index="${index}" style="background:#ff6b6b; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:12px;">Remove</button>
                    `;
                    scheduleListContainer.appendChild(li);
                });

                document.querySelectorAll('.delete-slot-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const idx = this.getAttribute('data-index');
                        const currentSlots = getTimeSlots();
                        currentSlots.splice(idx, 1);
                        localStorage.setItem('uep_time_slots', JSON.stringify(currentSlots));
                        renderAdminScheduleList();
                    });
                });
            }
        }

        if(settingsBtn) {
            settingsBtn.addEventListener('click', () => { 
                const isLocked = localStorage.getItem('uep_system_locked') === 'true';
                if(toggleBooking) toggleBooking.checked = !isLocked; 
                
                // NEW: Load saved MAX SLOTS
                const maxInput = document.getElementById('adminMaxSlots');
                if(maxInput) maxInput.value = getMaxSlots();

                renderAdminScheduleList(); 
                settingsModal.classList.add('active'); 
            });
            cancelSettings.addEventListener('click', () => { settingsModal.classList.remove('active'); });

            if(btnAddSlot && newSlotInput) {
                btnAddSlot.addEventListener('click', () => {
                    const val = newSlotInput.value.trim();
                    if(!val) return;
                    
                    const currentSlots = getTimeSlots();
                    currentSlots.push(val);
                    localStorage.setItem('uep_time_slots', JSON.stringify(currentSlots));
                    
                    newSlotInput.value = "";
                    renderAdminScheduleList();
                });
            }

            if(btnExportCSV) {
                btnExportCSV.addEventListener('click', () => {
                    const allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
                    let csvContent = "data:text/csv;charset=utf-8,Student ID,Full Name,Course,Sex,Date,Time,Reason,Diagnosis,Recommendation,Status\n";
                    Object.values(allUsers).forEach(user => {
                        if(user.history) user.history.forEach(r => csvContent += `${user.id},${user.fullName},${user.course},${user.sex},${r.date},${r.time},${r.reason.replace(/,/g," ")},${(r.diagnosis||"").replace(/,/g," ")},${(r.recommendation||"").replace(/,/g," ")},Completed\n`);
                        if(user.date) csvContent += `${user.id},${user.fullName},${user.course},${user.sex},${user.date},${user.time},${user.reason.replace(/,/g," ")},PENDING,PENDING,Active\n`;
                    });
                    const link = document.createElement("a");
                    link.setAttribute("href", encodeURI(csvContent));
                    link.setAttribute("download", "UEP_Clinic_Records.csv");
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                });
            }

            if(btnClear) {
                btnClear.addEventListener('click', () => {
                    if(prompt("Type 'DELETE' to confirm wipe:") === 'DELETE') {
                        localStorage.removeItem('uep_all_users');
                        localStorage.removeItem('uep_clinic_stats');
                        localStorage.removeItem('uep_slot_counts');
                        alert("System Reset.");
                        window.location.href = 'login.html';
                    }
                });
            }

            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // NEW: Save MAX SLOTS
                const maxSlotsInput = document.getElementById('adminMaxSlots');
                if(maxSlotsInput && maxSlotsInput.value) {
                    localStorage.setItem('uep_max_slots', maxSlotsInput.value);
                }

                const newUser = document.getElementById('newAdminUser').value.trim();
                const newPass = document.getElementById('newAdminPass').value.trim();
                
                if(toggleBooking) localStorage.setItem('uep_system_locked', !toggleBooking.checked);

                if(newUser && newPass) {
                    localStorage.setItem('uep_admin_creds', JSON.stringify({ user: newUser, pass: newPass }));
                    alert("Credentials changed. Please login again.");
                    localStorage.removeItem('uep_current_session_user');
                    window.location.href = 'login.html';
                } else {
                    alert("Settings Updated!");
                    settingsModal.classList.remove('active');
                    location.reload(); 
                }
            });
        }
    }
});