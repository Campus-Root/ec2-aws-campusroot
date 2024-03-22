
const client_id = "1000.UDKWYGGPL8NUYVPXK32GJKKJ4MU5BX"
const client_secret = "ce93db5020b9b880eb0419d783d759c5126c0e5359"
const refresh_token = "1000.9943b571b40c568be05ef7c5d7e4420a.16e2b6d874d1cc0e660b08c37887d765"

export const refreshToken = async () => {
    try {
        const formData = new URLSearchParams();
        formData.append('client_id', client_id);
        formData.append('client_secret', client_secret);
        formData.append('refresh_token', refresh_token);
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
                "data": [{...crmData}]
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

// async function test() {
//     try {
//         const formData = new URLSearchParams();
//         formData.append('client_id', client_id);
//         formData.append('client_secret', client_secret);
//         formData.append('refresh_token', refresh_token);
//         formData.append('grant_type', 'refresh_token');
//         const response1 = await fetch("https://accounts.zoho.in/oauth/v2/token", {
//             method: "POST",
//             headers: {
//                 "Cookie": "6e73717622=94da0c17b67b4320ada519c299270f95; _zcsr_tmp=c7e03338-ce1e-42ab-b257-4c365f3831bd; iamcsr=c7e03338-ce1e-42ab-b257-4c365f3831bd",
//                 "Content-Type": "application/x-www-form-urlencoded",
//                 "Accept": "*/*",
//                 "Accept-Encoding": "gzip, deflate, br",
//                 "Connection": "keep-alive"
//             },
//             body: formData.toString()
//         });
//         const { access_token } = await response1.json();
//         console.log(access_token);
//         let crmdata = { Last_Name: "kill this lead", Mobile: "+0123456789", Lead_Source: "Campusroot App", Email: "jsabcj@gmail.com" }
//         const response2 = await fetch("https://www.zohoapis.in/crm/v6/Leads", {
//             method: "POST",
//             headers: {
//                 "Authorization": `Zoho-oauthtoken ${access_token}`,   // change here
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 "data": [{ ...crmdata }]        // change here
//             })
//         });
//         const { data } = await response2.json();
//         console.log(data[0]);
//         console.log(data[0].details.id);
//     } catch (error) {
//         console.log(error);
//     }

// }
// test()