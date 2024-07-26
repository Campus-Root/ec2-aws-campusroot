import 'dotenv/config';
export const refreshToken = async () => {
    try {
        const formData = new URLSearchParams();
        formData.append('client_id', process.env.CRM_CLIENT_ID);
        formData.append('client_secret', process.env.CRM_CLIENT_SECRET);
        formData.append('refresh_token', process.env.CRM_REFRESH_TOKEN);
        formData.append('grant_type', 'refresh_token');
        const response = await fetch("https://accounts.zoho.in/oauth/v2/token", {
            method: "POST",
            headers: {
                "Cookie": "6e73717622=94da0c17b67b4320ada519c299270f95; _zcsr_tmp=c7e03338-ce1e-42ab-b257-4c365f3831bd; iamcsr=c7e03338-ce1e-42ab-b257-4c365f3831bd",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive"
            },
            body: formData.toString()
        });
        const { access_token } = await response.json();
        return access_token
    } catch (error) {
        console.log(error);
        return new Error(`error at crm refreshToken`)
    }
}

export const leadCreation = async (accessToken, crmData) => {
    try {
        const response = await fetch("https://www.zohoapis.in/crm/v6/Leads", {
            method: "POST",
            headers: {
                "Authorization": `Zoho-oauthtoken ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "data": [{ ...crmData }]
            })
        });
        const { data } = await response.json();
        console.log(data);
        return data
    } catch (error) {
        console.log(error);
        return new Error(`error at crm lead creation`)
    }
}