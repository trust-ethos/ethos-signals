// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SignalsAttestation
 * @notice Stores crypto trading signals onchain as attestations
 * @dev Modeled after Ethos' review contract pattern
 */
contract SignalsAttestation {
    
    // ============ Structs ============
    
    struct AttestationDetails {
        string account;     // Twitter account ID
        string service;     // Social platform (e.g., "x.com", "farcaster")
    }
    
    struct Signal {
        address author;              // Address of who wrote/saved the signal
        string subject;              // Project handle or identifier
        string tweetUrl;             // Source URL of the signal
        string tweetContent;         // Content of the tweet/signal
        bool isBullish;              // True for bullish, false for bearish
        string metadata;             // JSON metadata with additional info
        AttestationDetails attestationDetails;
        uint256 timestamp;           // When the signal was created
        bool archived;               // Whether the signal has been archived
    }
    
    // ============ State Variables ============
    
    /// @notice Mapping of signal ID to Signal struct
    mapping(uint256 => Signal) public signals;
    
    /// @notice Counter for signal IDs
    uint256 public signalCount;
    
    /// @notice Mapping of author address to their signal IDs
    mapping(address => uint256[]) public authorSignals;
    
    /// @notice Mapping of project handle to signal IDs about that project
    mapping(bytes32 => uint256[]) public projectSignals;
    
    // ============ Events ============
    
    event SignalCreated(
        uint256 indexed signalId,
        address indexed author,
        string subject,
        bool isBullish,
        string tweetUrl,
        uint256 timestamp
    );
    
    event SignalArchived(
        uint256 indexed signalId,
        address indexed author
    );
    
    event SignalRestored(
        uint256 indexed signalId,
        address indexed author
    );
    
    // ============ Modifiers ============
    
    modifier onlySignalAuthor(uint256 signalId) {
        require(signals[signalId].author == msg.sender, "Not signal author");
        _;
    }
    
    modifier signalExists(uint256 signalId) {
        require(signalId < signalCount, "Signal does not exist");
        _;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Create a new signal attestation
     * @param subject The project handle or identifier
     * @param tweetUrl Source URL of the signal
     * @param tweetContent Content of the tweet
     * @param isBullish True for bullish sentiment, false for bearish
     * @param metadata JSON string with additional metadata
     * @param account Twitter account ID
     * @param service Social platform name
     * @return signalId The ID of the created signal
     */
    function createSignal(
        string memory subject,
        string memory tweetUrl,
        string memory tweetContent,
        bool isBullish,
        string memory metadata,
        string memory account,
        string memory service
    ) external returns (uint256) {
        uint256 signalId = signalCount++;
        
        signals[signalId] = Signal({
            author: msg.sender,
            subject: subject,
            tweetUrl: tweetUrl,
            tweetContent: tweetContent,
            isBullish: isBullish,
            metadata: metadata,
            attestationDetails: AttestationDetails({
                account: account,
                service: service
            }),
            timestamp: block.timestamp,
            archived: false
        });
        
        // Track signal for author
        authorSignals[msg.sender].push(signalId);
        
        // Track signal for project (case-insensitive)
        bytes32 projectHash = keccak256(bytes(_toLower(subject)));
        projectSignals[projectHash].push(signalId);
        
        emit SignalCreated(
            signalId,
            msg.sender,
            subject,
            isBullish,
            tweetUrl,
            block.timestamp
        );
        
        return signalId;
    }
    
    /**
     * @notice Archive a signal (soft delete)
     * @param signalId The ID of the signal to archive
     */
    function archiveSignal(uint256 signalId) 
        external 
        signalExists(signalId)
        onlySignalAuthor(signalId) 
    {
        require(!signals[signalId].archived, "Signal already archived");
        signals[signalId].archived = true;
        
        emit SignalArchived(signalId, msg.sender);
    }
    
    /**
     * @notice Restore an archived signal
     * @param signalId The ID of the signal to restore
     */
    function restoreSignal(uint256 signalId) 
        external 
        signalExists(signalId)
        onlySignalAuthor(signalId) 
    {
        require(signals[signalId].archived, "Signal not archived");
        signals[signalId].archived = false;
        
        emit SignalRestored(signalId, msg.sender);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get a signal by ID
     * @param signalId The ID of the signal
     * @return The Signal struct
     */
    function getSignal(uint256 signalId) 
        external 
        view 
        signalExists(signalId)
        returns (Signal memory) 
    {
        return signals[signalId];
    }
    
    /**
     * @notice Get all signal IDs for an author
     * @param author The address of the author
     * @return Array of signal IDs
     */
    function getSignalsByAuthor(address author) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return authorSignals[author];
    }
    
    /**
     * @notice Get all signal IDs for a project
     * @param subject The project handle (case-insensitive)
     * @return Array of signal IDs
     */
    function getSignalsByProject(string memory subject) 
        external 
        view 
        returns (uint256[] memory) 
    {
        bytes32 projectHash = keccak256(bytes(_toLower(subject)));
        return projectSignals[projectHash];
    }
    
    /**
     * @notice Get multiple signals by IDs
     * @param signalIds Array of signal IDs to fetch
     * @return Array of Signal structs
     */
    function getSignalsBatch(uint256[] memory signalIds) 
        external 
        view 
        returns (Signal[] memory) 
    {
        Signal[] memory result = new Signal[](signalIds.length);
        for (uint256 i = 0; i < signalIds.length; i++) {
            if (signalIds[i] < signalCount) {
                result[i] = signals[signalIds[i]];
            }
        }
        return result;
    }
    
    /**
     * @notice Get sentiment statistics for a project
     * @param subject The project handle
     * @return bullishCount Number of bullish signals
     * @return bearishCount Number of bearish signals
     */
    function getProjectSentiment(string memory subject) 
        external 
        view 
        returns (uint256 bullishCount, uint256 bearishCount) 
    {
        bytes32 projectHash = keccak256(bytes(_toLower(subject)));
        uint256[] memory signalIds = projectSignals[projectHash];
        
        for (uint256 i = 0; i < signalIds.length; i++) {
            Signal memory signal = signals[signalIds[i]];
            if (!signal.archived) {
                if (signal.isBullish) {
                    bullishCount++;
                } else {
                    bearishCount++;
                }
            }
        }
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Convert string to lowercase for case-insensitive comparisons
     * @param str Input string
     * @return Lowercase string
     */
    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint256 i = 0; i < bStr.length; i++) {
            // If uppercase character, convert to lowercase
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
}


