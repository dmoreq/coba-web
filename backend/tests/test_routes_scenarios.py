"""Integration tests for the scenarios route."""


class TestScenariosRoute:
    def test_returns_five_scenarios(self, client):
        r = client.get("/api/scenarios")
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_each_scenario_has_required_fields(self, client):
        scenario = client.get("/api/scenarios").json()[0]
        assert {
            "id",
            "label",
            "description",
            "domain",
            "feature_count",
            "arm_count",
            "has_drift",
        } <= set(scenario)

    def test_notification_channels_shape(self, client):
        scenarios = {item["id"]: item for item in client.get("/api/scenarios").json()}
        notification_channels = scenarios["notification_channels"]
        assert notification_channels["feature_count"] == 2
        assert notification_channels["arm_count"] == 4
        assert notification_channels["has_drift"] is False

    def test_content_format_has_drift_true(self, client):
        scenarios = {item["id"]: item for item in client.get("/api/scenarios").json()}
        assert scenarios["content_format"]["has_drift"] is True
