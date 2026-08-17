let currentAlarmId = null;
let isAlarmVisible = false;

function checkActiveAlarms() {
    // Only check if we are not already showing an alarm
    if (isAlarmVisible) return;

    fetch('/api/active-alarms/')
        .then(response => response.json())
        .then(data => {
            if (data.has_alarm) {
                showGlobalAlarm(data);
            }
        })
        .catch(err => console.error("Error checking alarms:", err));
}

function showGlobalAlarm(alarmData) {
    currentAlarmId = alarmData.alarm_id;
    isAlarmVisible = true;
    
    const modal = document.getElementById('global-alarm-modal');
    const box = document.getElementById('global-alarm-box');
    const title = document.getElementById('global-alarm-title');
    const devName = document.getElementById('alarm-device-name');
    const msg = document.getElementById('alarm-message');
    const ts = document.getElementById('alarm-timestamp');
    
    devName.innerText = `${alarmData.device_id} - ${alarmData.device_name}`;
    ts.innerText = `Detected at: ${alarmData.timestamp}`;
    
    if (alarmData.alarm_type === 'low') {
        box.classList.add('low-alarm');
        title.innerText = 'WARNING ALARM (LOW)';
        msg.innerText = `Level dropped to ${alarmData.level}`;
    } else {
        box.classList.remove('low-alarm');
        title.innerText = 'CRITICAL ALARM (HIGH)';
        msg.innerText = `Level exceeded limits (${alarmData.level})`;
    }
    
    modal.style.display = 'flex';
    
    // Play a sound if you want, or just rely on the pulsing animation
}

function acknowledgeGlobalAlarm() {
    if (!currentAlarmId) return;
    
    // Disable button to prevent double-click
    const btn = document.getElementById('alarm-ack-btn');
    btn.innerText = "Acknowledging...";
    btn.disabled = true;
    
    fetch('/api/acknowledge-alarm/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ alarm_id: currentAlarmId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('global-alarm-modal').style.display = 'none';
            isAlarmVisible = false;
            currentAlarmId = null;
        } else {
            console.error("Failed to acknowledge alarm:", data.message);
        }
    })
    .catch(err => console.error("Error acknowledging alarm:", err))
    .finally(() => {
        btn.innerText = "OK";
        btn.disabled = false;
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Check every 5 seconds
setInterval(checkActiveAlarms, 5000);
