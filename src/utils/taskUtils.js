// Utility to clean task data before sending to Supabase
export const cleanTaskData = (data) => {
    const allowedFields = [
        'name', 'type', 'description', 'address', 'city', 'lat', 'lng',
        'urgency', 'volunteers_needed', 'status', 'requester_name',
        'requester_phone', 'time_type', 'due_date', 'start_date',
        'end_date', 'notes'
    ];

    const clean = {};
    allowedFields.forEach(f => {
        if (data[f] !== undefined && data[f] !== null) {
            // Numbers
            if (f === 'volunteers_needed') {
                const val = parseInt(data[f]);
                clean[f] = isNaN(val) ? 1 : val;
            }
            // Dates - Extremely important to send null and not empty string
            else if (['due_date', 'start_date', 'end_date'].includes(f)) {
                clean[f] = data[f] === '' ? null : data[f];
            }
            // Strings
            else {
                clean[f] = data[f];
            }
        }
    });
    return clean;
};

// Utility to clean volunteer data
export const cleanVolunteerData = (data) => {
    const allowedFields = [
        'full_name', 'phone', 'age', 'address', 'city', 'lat', 'lng',
        'has_car', 'gender', 'skills', 'notes', 'status', 'volunteer_type',
        'group_name', 'org_name', 'group_size', 'contact_person', 'contact_phone'
    ];

    const clean = {};
    allowedFields.forEach(f => {
        if (data[f] !== undefined && data[f] !== null) {
            if (f === 'age' || f === 'group_size') {
                const val = parseInt(data[f]);
                clean[f] = isNaN(val) ? null : val;
            } else {
                clean[f] = data[f];
            }
        }
    });
    return clean;
};
