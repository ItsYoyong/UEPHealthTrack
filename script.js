document.addEventListener('DOMContentLoaded', function() {

    // ============================
    // 1. CONFIGURATION & CONSTANTS
    // ============================
    const MAX_SLOTS = 10;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const phHolidays = ["0-1", "1-25", "3-9", "4-1", "5-12", "7-21", "7-26", "10-1", "10-2", "10-30", "11-8", "11-24", "11-25", "11-30", "11-31"];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    // ============================
    // 2. HELPER FUNCTIONS
    // ============================
    function getSessionUser() {
        const u = localStorage.getItem('uep_current_session_user');
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

    // ============================
    // 3. STATS INITIALIZATION
    // ============================
    let stats = JSON.parse(localStorage.getItem('uep_clinic_stats')) || {
        pending: 0,
        todayCount: 0,
        allTime: 0,
        lastDate: todayString
    };
    
    // Reset daily count if day changed
    if (stats.lastDate !== todayString) {
        stats.todayCount = 0;
        stats.lastDate = todayString;
        localStorage.setItem('uep_clinic_stats', JSON.stringify(stats));
    }

    // Update UI Stats
    const statPending = document.getElementById('statPending');
    if (statPending) {
        statPending.innerText = stats.pending;
        document.getElementById('statToday').innerText = stats.todayCount;
        document.getElementById('statAllTime').innerText = stats.allTime.toLocaleString();
    }

    // ============================
    // 4. AUTHENTICATION (LOGOUT/LOGIN)
    // ============================
    const profileLogout = document.getElementById('logoutBtn');
    if (profileLogout) {
        profileLogout.addEventListener('click', () => {
            localStorage.removeItem('uep_current_session_user');
            window.location.href = 'login.html';
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        if (localStorage.getItem('uep_current_session_user')) {
            window.location.href = 'home.html';
        }
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const u = document.getElementById('loginUsername').value.trim();
            const p = document.getElementById('loginPassword').value.trim();
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
            
            // This now gets the value from the <select>, which is "" if N/A is chosen
            const suffix = document.getElementById('regSuffix').value.trim();
            const sexVal = document.getElementById('regSex').value;

            let fullName = `${fName} ${mName} ${lName}`;
            if (suffix) fullName += ` ${suffix}`;

            const u = document.getElementById('regUsername').value;
            const p = document.getElementById('regPassword').value;
            const id = document.getElementById('regID').value;

            // --- NEW: VALIDATE SCHOOL ID (Must be exactly 6 digits) ---
            if (id.length !== 6) {
                alert("School ID must be exactly 6 digits.");
                return; // Stop function
            }

            let allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
            if (allUsers[u]) {
                alert("Username taken");
                return;
            }

            // Create User Object
            allUsers[u] = {
                username: u,
                password: p,
                firstName: fName,
                middleName: mName,
                lastName: lName,
                suffix: suffix,
                fullName: fullName,
                id: id,
                sex: sexVal,
                course: "", 
                address: "",
                birthday: "No Birthday",
                email: "", 
                initials: fName.charAt(0).toUpperCase(),
                date: null,
                time: null,
                reason: ""
            };

            localStorage.setItem('uep_all_users', JSON.stringify(allUsers));
            
            // --- CLEAR FORM DATA IMMEDIATELY ---
            regForm.reset(); 
            
            alert("Account Created! Please login.");
            window.location.href = 'login.html';
        });
    }

    // ============================
    // 6. BOOKING LOGIC
    // ============================
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        const currentUser = getSessionUser();
        if (currentUser) {
            // Auto-fill form
            const fNameInput = document.getElementById('firstName');
            const mNameInput = document.getElementById('middleName');
            const lNameInput = document.getElementById('lastName');
            const sIDInput = document.getElementById('studentID');

            if (fNameInput) {
                if (currentUser.firstName) {
                    let displayFirst = currentUser.firstName;
                    if (currentUser.suffix) displayFirst += " " + currentUser.suffix;
                    fNameInput.value = displayFirst;
                } else {
                    fNameInput.value = currentUser.fullName;
                }
                fNameInput.readOnly = true;
            }
            if (mNameInput) { mNameInput.value = currentUser.middleName || ""; mNameInput.readOnly = true; }
            if (lNameInput) { lNameInput.value = currentUser.lastName || ""; lNameInput.readOnly = true; }
            if (sIDInput) { sIDInput.value = currentUser.id; sIDInput.readOnly = true; }
        }

        // Reason Toggle
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

        // Calendar Vars
        let selectedDateText = "";
        let selectedTimeText = "";
        
        function initCalendar() {
            const calendarGrid = document.getElementById('calendarGrid');
            const monthLabel = document.getElementById('currentMonthYear');
            const prevBtn = document.getElementById('prevMonth');
            const nextBtn = document.getElementById('nextMonth');
            let currentViewDate = new Date();

            function render(date) {
                calendarGrid.innerHTML = '';
                const year = date.getFullYear();
                const month = date.getMonth();
                if (monthLabel) monthLabel.innerText = `${monthNames[month]} ${year}`;

                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDayIndex = new Date(year, month, 1).getDay();
                
                // Calculate max date (2 months from now)
                const lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                const thresholdDate = new Date(lastDayOfCurrentMonth);
                thresholdDate.setDate(lastDayOfCurrentMonth.getDate() - 2);
                let maxAllowedBookingDate;
                if (today >= thresholdDate) {
                    maxAllowedBookingDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
                } else {
                    maxAllowedBookingDate = lastDayOfCurrentMonth;
                }

                // Empty slots
                for (let x = firstDayIndex; x > 0; x--) {
                    const spacer = document.createElement('div');
                    spacer.style.visibility = "hidden";
                    calendarGrid.appendChild(spacer);
                }

                // Days
                for (let i = 1; i <= daysInMonth; i++) {
                    let day = document.createElement('div');
                    day.className = 'calendar-day';
                    day.innerText = i;
                    const checkDate = new Date(year, month, i);
                    checkDate.setHours(0, 0, 0, 0);

                    // Logic for disabling dates
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
                            
                            document.querySelectorAll('.time-btn').forEach(b => {
                                b.classList.remove('selected');
                                b.disabled = false;
                                b.style.backgroundColor = "";
                            });
                            updateTimeButtons(selectedDateText);
                        };
                    }
                    calendarGrid.appendChild(day);
                }
            }
            render(currentViewDate);
            prevBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); render(currentViewDate); };
            nextBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); render(currentViewDate); };
        }

        function updateTimeButtons(dateKey) {
            const counts = getSlotCounts();
            const dateData = counts[dateKey] || {};
            document.querySelectorAll('.time-btn').forEach(btn => {
                const timeKey = btn.getAttribute('data-time');
                const current = dateData[timeKey] || 0;
                const span = btn.querySelector('.btn-count-text');
                if (span) span.innerText = `${current}/${MAX_SLOTS} slots`;
                if (current >= MAX_SLOTS) {
                    btn.disabled = true;
                    btn.style.backgroundColor = "#ccc";
                }
            });
        }
        
        initCalendar();

        // Time Button Clicks
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                if (!selectedDateText) {
                    alert("Please select a date first.");
                    return;
                }
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                selectedTimeText = this.getAttribute('data-time');
                
                const counts = getSlotCounts();
                const currentCount = (counts[selectedDateText] && counts[selectedDateText][selectedTimeText]) || 0;
                const pct = (currentCount / MAX_SLOTS) * 100;
                
                document.getElementById('slotStatusDisplay').style.display = 'block';
                document.getElementById('statusTextContent').innerText = `${currentCount} / ${MAX_SLOTS} Slots Taken (${Math.round(pct)}%)`;
                document.getElementById('progressBarFill').style.width = `${pct}%`;
            });
        });

        // Submit Booking
        document.getElementById('confirmBtn').addEventListener('click', function() {
            let reasonVal = document.getElementById('reason').value.trim();
            const otherVal = document.getElementById('otherReason').value.trim();
            
            if (!reasonVal) {
                alert("Please select a reason.");
                return;
            }
            if (reasonVal === "Other") {
                if (!otherVal) {
                    alert("Please specify reason.");
                    document.getElementById('otherReason').focus();
                    return;
                }
                reasonVal = `Other: ${otherVal}`;
            }
            if (!selectedDateText || !selectedTimeText) {
                alert("Please select Date and Time.");
                return;
            }

            let counts = getSlotCounts();
            if (!counts[selectedDateText]) counts[selectedDateText] = {};
            if (!counts[selectedDateText][selectedTimeText]) counts[selectedDateText][selectedTimeText] = 0;
            if (counts[selectedDateText][selectedTimeText] >= MAX_SLOTS) {
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
        if (!sessionUser) {
            window.location.href = 'login.html';
            return;
        }
        let allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
        let user = allUsers[sessionUser];

        if (user) {
            // Populate Display
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

            // History Table
            const historyBody = document.getElementById('recentVisitsBody');
            if (historyBody) {
                if (user.history && user.history.length > 0) {
                    historyBody.innerHTML = "";
                    user.history.forEach(visit => {
                        historyBody.innerHTML += `<tr><td>${visit.date}</td><td>${visit.reason}</td><td class="status-completed" style="color:orange;">Pending</td></tr>`;
                    });
                } else {
                    if (user.date) historyBody.innerHTML = `<tr><td>${user.date}</td><td>${user.reason}</td><td style="color:#ffa50c; font-weight:bold;">Upcoming</td></tr>`;
                    else historyBody.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.7;">No recent visits.</td></tr>`;
                }
            }
        }

        // Edit Modal Logic
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
            
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
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
});